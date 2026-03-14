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
    if (decoded.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Access denied. Superadmin only.' },
        { status: 403 }
      );
    }
    const awards = await Award.find({}).lean();
    const organizations = await Organization.find({}).lean();
    const orgServiceFees: Record<string, number> = {};
    organizations.forEach(org => {
      orgServiceFees[org._id.toString()] = org.serviceFeePercentage || 10;
    });
    let totalRevenue = 0;
    const revenueByOrganization: Record<string, {
      organizationId: string;
      organizationName: string;
      totalRevenue: number;
      platformFee: number;
      transferredToOrganizer: number;
      serviceFeePercentage: number;
    }> = {};

    for (const award of awards) {
      const votes = await Vote.find({ awardId: award._id.toString(), paymentStatus: 'completed' });
      const votingRevenue = votes.reduce((sum, v) => sum + (v.amount || 0), 0);

      const payments = await Payment.find({ awardId: award._id.toString(), status: 'completed' });
      const nominationRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

      const awardRevenue = votingRevenue + nominationRevenue;
      totalRevenue += awardRevenue;
      const orgId = award.organizationId;
      const serviceFeePercentage = orgServiceFees[orgId] || 10;

      if (!revenueByOrganization[orgId]) {
        revenueByOrganization[orgId] = {
          organizationId: orgId,
          organizationName: award.organizationName,
          totalRevenue: 0,
          platformFee: 0,
          transferredToOrganizer: 0,
          serviceFeePercentage,
        };
      }

      revenueByOrganization[orgId].totalRevenue += awardRevenue;
      revenueByOrganization[orgId].platformFee += awardRevenue * (serviceFeePercentage / 100);
    }
    const allTransfers = await Transfer.find({ status: 'completed' });
    const totalTransferred = allTransfers.reduce((sum, t) => sum + t.amount, 0);
    for (const transfer of allTransfers) {
      const orgId = transfer.organizationId;
      if (revenueByOrganization[orgId]) {
        revenueByOrganization[orgId].transferredToOrganizer += transfer.amount;
      }
    }
    const totalPlatformFees = Object.values(revenueByOrganization).reduce(
      (sum, org) => sum + org.platformFee,
      0
    );
    const transferCount = allTransfers.length;
    const successfulTransfers = allTransfers.length; // All fetched transfers are completed
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
    return NextResponse.json(
      { error: 'Failed to fetch platform revenue', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
