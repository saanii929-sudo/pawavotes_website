import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Vote from '@/models/Vote';
import { verifyToken } from '@/lib/auth';
import { hasAwardAccess } from '@/lib/access-control';

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
    const categoryId = searchParams.get('categoryId');
    const nomineeId = searchParams.get('nomineeId');

    let query: any = {};

    // Build query based on filters
    if (awardId) {
      // Check if user has access to this award
      let assignedAwards: string[] = [];
      if (decoded.role === 'org-admin') {
        const OrganizationAdmin = (await import('@/models/OrganizationAdmin')).default;
        const admin = await OrganizationAdmin.findById(decoded.id);
        assignedAwards = admin?.assignedAwards?.map((id: any) => id.toString()) || [];
      }
      
      console.log('Votes API access check:', {
        userId: decoded.id,
        role: decoded.role,
        awardId,
        assignedAwards,
      });
      
      const hasAccess = await hasAwardAccess(decoded.id, decoded.role, awardId, assignedAwards);
      console.log('Access result:', hasAccess);
      
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      query.awardId = awardId;
    } else {
      // If no awardId specified, filter by user's accessible awards
      if (decoded.role === 'org-admin') {
        // Get org-admin's assigned awards
        const OrganizationAdmin = (await import('@/models/OrganizationAdmin')).default;
        const admin = await OrganizationAdmin.findById(decoded.id);
        if (!admin || !admin.assignedAwards || admin.assignedAwards.length === 0) {
          return NextResponse.json({ success: true, data: [] });
        }
        query.awardId = { $in: admin.assignedAwards };
      } else if (decoded.role === 'organization') {
        // Get organization's awards
        const Award = (await import('@/models/Award')).default;
        const awards = await Award.find({ organizationId: decoded.id }).select('_id');
        const awardIds = awards.map(a => a._id.toString());
        if (awardIds.length === 0) {
          return NextResponse.json({ success: true, data: [] });
        }
        query.awardId = { $in: awardIds };
      }
    }

    if (categoryId) {
      query.categoryId = categoryId;
    }

    if (nomineeId) {
      query.nomineeId = nomineeId;
    }

    // Only get completed payments
    query.paymentStatus = 'completed';

    const votes = await Vote.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // Populate nominee and category details
    const Nominee = (await import('@/models/Nominee')).default;
    const Category = (await import('@/models/Category')).default;

    const votesWithDetails = await Promise.all(
      votes.map(async (vote) => {
        const nominee = await Nominee.findById(vote.nomineeId).select('name image').lean();
        const category = await Category.findById(vote.categoryId).select('name').lean();
        
        return {
          ...vote,
          nominee,
          category,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: votesWithDetails,
    });
  } catch (error: any) {
    console.error('Get votes error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch votes', details: error.message },
      { status: 500 }
    );
  }
}
