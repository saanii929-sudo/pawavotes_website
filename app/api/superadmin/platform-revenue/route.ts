import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Transfer from '@/models/Transfer';
import Vote from '@/models/Vote';
import Payment from '@/models/Payment';
import Award from '@/models/Award';
import Organization from '@/models/Organization';
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

    // Only superadmin can access this
    if (decoded.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Access denied. Superadmin only.' },
        { status: 403 }
      );
    }

    // Get all awards
    const awards = await Award.find({}).lean();

    // Calculate total revenue across all awards
    let totalRevenue = 0;
    const revenueByOrganization: Record<string, {
      organizationId: string;
      organizationName: string;
      totalRevenue: number;
      platformFee: number;
      transferredToOrganizer: number;
    }> = {};

    for (const award of awards) {
      // Calculate revenue for this award
      const votes = await Vote.find({ awardId: award._id, paymentStatus: 'completed' });
      const votingRevenue = votes.reduce((sum, v) => sum + (v.amount || 0), 0);

      const payments = await Payment.find({ awardId: award._id, status: 'completed' });
      const nominationRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

      const awardRevenue = votingRevenue + nominationRevenue;
      totalRevenue += awardRevenue;

      // Group by organization
      const orgId = award.organizationId;
      if (!revenueByOrganization[orgId]) {
        revenueByOrganization[orgId] = {
          organizationId: orgId,
          organizationName: award.organizationName,
          totalRevenue: 0,
          platformFee: 0,
          transferredToOrganizer: 0,
        };
      }

      revenueByOrganization[orgId].totalRevenue += awardRevenue;
      revenueByOrganization[orgId].platformFee += awardRevenue * 0.1;
    }

    // Get all successful transfers
    const allTransfers = await Transfer.find({ status: 'successful' });
    const totalTransferred = allTransfers.reduce((sum, t) => sum + t.amount, 0);

    // Add transferred amounts to organization data
    for (const transfer of allTransfers) {
      const orgId = transfer.organizationId;
      if (revenueByOrganization[orgId]) {
        revenueByOrganization[orgId].transferredToOrganizer += transfer.amount;
      }
    }

    // Calculate platform fees (10% of total revenue)
    const totalPlatformFees = totalRevenue * 0.1;

    // Get transfer statistics
    const transferCount = allTransfers.length;
    const successfulTransfers = allTransfers.filter(t => t.status === 'successful').length;
    const pendingTransfers = await Transfer.countDocuments({ status: 'pending' });

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        totalPlatformFees,
        totalTransferred,
        transferCount,
        successfulTransfers,
        pendingTransfers,
        revenueByOrganization: Object.values(revenueByOrganization),
      },
    });
  } catch (error: any) {
    console.error('Get platform revenue error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch platform revenue', details: error.message },
      { status: 500 }
    );
  }
}
