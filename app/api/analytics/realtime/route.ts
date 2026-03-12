import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Vote from '@/models/Vote';
import Payment from '@/models/Payment';
import Award from '@/models/Award';
import Nominee from '@/models/Nominee';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const awardId = searchParams.get('awardId');

    // Build query based on user role
    let voteQuery: any = { paymentStatus: 'completed' };
    let paymentQuery: any = { status: 'completed' };

    if (decoded.role === 'organization') {
      // Get organization's awards
      const awards = await Award.find({ organizationId: decoded.id }).select('_id');
      const awardIds = awards.map(a => a._id.toString());
      
      if (awardIds.length === 0) {
        return NextResponse.json({ success: true, data: getEmptyAnalytics() });
      }
      
      voteQuery.awardId = { $in: awardIds };
      paymentQuery.awardId = { $in: awardIds };
    } else if (decoded.role === 'org-admin') {
      const OrganizationAdmin = (await import('@/models/OrganizationAdmin')).default;
      const admin = await OrganizationAdmin.findById(decoded.id);
      
      if (!admin || !admin.assignedAwards || admin.assignedAwards.length === 0) {
        return NextResponse.json({ success: true, data: getEmptyAnalytics() });
      }
      
      voteQuery.awardId = { $in: admin.assignedAwards };
      paymentQuery.awardId = { $in: admin.assignedAwards };
    }

    // If specific award requested
    if (awardId) {
      voteQuery.awardId = awardId;
      paymentQuery.awardId = awardId;
    }

    // Get real-time stats
    const now = new Date();
    // Use UTC midnight for today to match MongoDB's UTC storage
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    
    console.log('Analytics query:', {
      todayStart: todayStart.toISOString(),
      todayStartLocal: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString(),
      now: now.toISOString(),
      serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      voteQuery,
    });

    // Get all votes first (sorted by most recent)
    const allVotesData = await Vote.find(voteQuery)
      .select('amount numberOfVotes createdAt nomineeId voterPhone paymentMethod')
      .sort({ createdAt: -1 })
      .lean();
    
    console.log('All votes found:', allVotesData.length);
    console.log('Most recent 5 votes:', allVotesData.slice(0, 5).map(v => ({ 
      amount: v.amount, 
      votes: v.numberOfVotes, 
      createdAt: v.createdAt,
      createdAtISO: new Date(v.createdAt).toISOString(),
      isToday: new Date(v.createdAt) >= todayStart
    })));

    // Calculate totals manually
    const totalVotes = allVotesData.length;
    const totalRevenue = allVotesData.reduce((sum, vote) => sum + (vote.amount || 0), 0);
    
    const votesTodayData = allVotesData.filter(v => new Date(v.createdAt) >= todayStart);
    const votesToday = votesTodayData.length;
    const revenueToday = votesTodayData.reduce((sum, vote) => sum + (vote.amount || 0), 0);

    // Create aggregation-friendly query using the vote IDs we already have
    const voteIds = allVotesData.map(v => (v as any)._id);
    const aggQuery: any = { 
      _id: { $in: voteIds }
    };

    console.log('Aggregation query with vote IDs:', voteIds.length, 'votes');

    const [
      topNominees,
      votesByHour,
      paymentMethods,
      votingTrend,
    ] = await Promise.all([
      
      // Top 10 nominees by votes
      Vote.aggregate([
        { $match: aggQuery },
        {
          $group: {
            _id: '$nomineeId',
            totalVotes: { $sum: '$numberOfVotes' },
            totalAmount: { $sum: '$amount' },
            voteCount: { $sum: 1 },
          },
        },
        { $sort: { totalVotes: -1 } },
        { $limit: 10 },
      ]),
      
      // Votes by hour (last 24 hours)
      Vote.aggregate([
        {
          $match: {
            ...aggQuery,
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: { $hour: '$createdAt' },
            count: { $sum: 1 },
            amount: { $sum: '$amount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      
      // Payment methods breakdown
      Vote.aggregate([
        { $match: aggQuery },
        {
          $group: {
            _id: '$paymentMethod',
            count: { $sum: 1 },
            amount: { $sum: '$amount' },
          },
        },
      ]),
      
      // Voting trend (last 7 days)
      Vote.aggregate([
        {
          $match: {
            ...aggQuery,
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            votes: { $sum: '$numberOfVotes' },
            transactions: { $sum: 1 },
            revenue: { $sum: '$amount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Calculate votes by region from the data we have
    const votesByRegion = allVotesData.reduce((acc: any[], vote) => {
      const prefix = vote.voterPhone?.substring(0, 5) || 'Unknown';
      const existing = acc.find(r => r._id === prefix);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ _id: prefix, count: 1 });
      }
      return acc;
    }, []).sort((a, b) => b.count - a.count).slice(0, 10);

    // Get recent votes (already sorted from the query)
    const recentVotes = allVotesData.slice(0, 20);

    console.log('Recent votes being returned:', recentVotes.length);
    console.log('First 3 recent votes:', recentVotes.slice(0, 3).map(v => ({
      id: (v as any)._id,
      nominee: v.nomineeId,
      amount: v.amount,
      votes: v.numberOfVotes,
      createdAt: new Date(v.createdAt).toISOString(),
      paymentMethod: v.paymentMethod
    })));

    console.log('Aggregation results:', {
      topNominees: topNominees.length,
      votesByHour: votesByHour.length,
      paymentMethods: paymentMethods.length,
      votingTrend: votingTrend.length,
    });

    // Populate nominee details for top nominees
    const nomineeIds = topNominees.map(n => n._id);
    const nominees = await Nominee.find({ _id: { $in: nomineeIds } })
      .populate('categoryId', 'name')
      .select('name image categoryId')
      .lean();

    const topNomineesWithDetails = topNominees.map(nominee => {
      const details = nominees.find(n => n._id.toString() === nominee._id.toString());
      return {
        ...nominee,
        nominee: details,
      };
    });

    // Populate recent votes
    const recentNomineeIds = recentVotes.map(v => v.nomineeId);
    const recentNominees = await Nominee.find({ _id: { $in: recentNomineeIds } })
      .select('name image')
      .lean();

    const recentVotesWithDetails = recentVotes.map(vote => {
      const nominee = recentNominees.find(n => n._id.toString() === vote.nomineeId.toString());
      return {
        ...vote,
        nominee,
      };
    });

    const analyticsData = {
      overview: {
        totalVotes,
        totalRevenue,
        votesToday,
        revenueToday,
        averageVoteValue: totalVotes > 0 ? totalRevenue / totalVotes : 0,
      },
      topNominees: topNomineesWithDetails,
      votesByRegion,
      votesByHour,
      recentVotes: recentVotesWithDetails,
      paymentMethods,
      votingTrend,
      timestamp: new Date().toISOString(),
    };

    console.log('Analytics overview:', analyticsData.overview);

    return NextResponse.json({
      success: true,
      data: analyticsData,
    });
  } catch (error: any) {
    console.error('Real-time analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics', details: error.message },
      { status: 500 }
    );
  }
}

function getEmptyAnalytics() {
  return {
    overview: {
      totalVotes: 0,
      totalRevenue: 0,
      votesToday: 0,
      revenueToday: 0,
      averageVoteValue: 0,
    },
    topNominees: [],
    votesByRegion: [],
    votesByHour: [],
    recentVotes: [],
    paymentMethods: [],
    votingTrend: [],
    timestamp: new Date().toISOString(),
  };
}
