import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Award from '@/models/Award';
import Category from '@/models/Category';
import Nominee from '@/models/Nominee';
import Vote from '@/models/Vote';
import Payment from '@/models/Payment';
import { verifyToken } from '@/lib/auth';
import OrganizationAdmin from '@/models/OrganizationAdmin';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    // Determine which awards this user can see
    let awardFilter: any = {};
    if (decoded.role === 'org-admin') {
      const admin = await OrganizationAdmin.findById(decoded.id).select('assignedAwards').lean();
      const assignedAwards = admin?.assignedAwards || [];
      if (assignedAwards.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            totalAwards: 0, totalCategories: 0, totalNominees: 0,
            totalVotes: 0, totalPayments: 0, totalAmount: 0,
            recentPayments: [], votingVelocity: [],
          },
        });
      }
      awardFilter = { _id: { $in: assignedAwards } };
    } else {
      awardFilter = { organizationId: decoded.id };
    }

    // Get award IDs in one query
    const awards = await Award.find(awardFilter).select('_id').lean();
    const awardIds = awards.map(a => a._id.toString());

    if (awardIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          totalAwards: 0, totalCategories: 0, totalNominees: 0,
          totalVotes: 0, totalPayments: 0, totalAmount: 0,
          recentPayments: [], votingVelocity: [],
        },
      });
    }

    const awardIdFilter = { awardId: { $in: awardIds } };

    // Run ALL aggregations in parallel — single DB round trip per collection
    const [
      totalCategories,
      totalNominees,
      nomineeVoteSum,
      voteAgg,
      paymentAgg,
      recentVotes,
      recentPayments,
    ] = await Promise.all([
      Category.countDocuments(awardIdFilter),
      Nominee.countDocuments(awardIdFilter),
      // Sum voteCount from nominees (the displayed "total votes")
      Nominee.aggregate([
        { $match: awardIdFilter },
        { $group: { _id: null, total: { $sum: '$voteCount' } } },
      ]),
      // Vote collection stats (count + amount)
      Vote.aggregate([
        { $match: { ...awardIdFilter, paymentStatus: 'completed' } },
        { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$amount' } } },
      ]),
      // Payment collection stats (count + amount)
      Payment.aggregate([
        { $match: { awardId: { $in: awardIds }, status: 'successful' } },
        { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$amount' } } },
      ]),
      // Recent votes (last 10) for the feed
      Vote.find({ ...awardIdFilter, paymentStatus: 'completed' })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('amount numberOfVotes createdAt')
        .lean(),
      // Recent payments (last 10)
      Payment.find({ awardId: { $in: awardIds }, status: 'successful' })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('amount createdAt')
        .lean(),
    ]);

    const totalVotes = nomineeVoteSum[0]?.total || 0;
    const voteStats = voteAgg[0] || { count: 0, amount: 0 };
    const paymentStats = paymentAgg[0] || { count: 0, amount: 0 };
    const totalAmount = voteStats.amount + paymentStats.amount;
    const totalPayments = voteStats.count + paymentStats.count;

    // Voting velocity — last 7 days aggregation
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const velocityData = await Vote.aggregate([
      {
        $match: {
          ...awardIdFilter,
          paymentStatus: 'completed',
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          votes: { $sum: '$numberOfVotes' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill in missing days with 0
    const votingVelocity = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const found = velocityData.find((d: any) => d._id === dateStr);
      votingVelocity.push({ date: dateStr, votes: found?.votes || 0 });
    }

    // Combine recent items for the feed
    const combined = [
      ...recentVotes.map((v: any) => ({ ...v, type: 'voting', voteCount: v.numberOfVotes })),
      ...recentPayments.map((p: any) => ({ ...p, type: 'nomination' })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);

    return NextResponse.json({
      success: true,
      data: {
        totalAwards: awardIds.length,
        totalCategories,
        totalNominees,
        totalVotes,
        totalPayments,
        totalAmount,
        recentPayments: combined,
        votingVelocity,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
