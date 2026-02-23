import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Transfer from '@/models/Transfer';
import Vote from '@/models/Vote';
import Payment from '@/models/Payment';
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

    const awardId = req.nextUrl.searchParams.get('awardId');

    if (!awardId) {
      return NextResponse.json(
        { success: false, message: 'awardId query parameter is required' },
        { status: 400 }
      );
    }

    let serviceFeePercentage = 10;
    if (decoded.role === 'organization') {
      const Award = (await import('@/models/Award')).default;
      const award = await Award.findOne({
        _id: awardId,
        organizationId: decoded.id,
      });

      if (!award) {
        return NextResponse.json(
          { error: 'Award not found or access denied' },
          { status: 404 }
        );
      }

      const Organization = (await import('@/models/Organization')).default;
      const organization = await Organization.findById(decoded.id);
      serviceFeePercentage = organization?.serviceFeePercentage || 10;
    } else {
      const Award = (await import('@/models/Award')).default;
      const award = await Award.findById(awardId);
      if (award) {
        const Organization = (await import('@/models/Organization')).default;
        const organization = await Organization.findById(award.organizationId);
        serviceFeePercentage = organization?.serviceFeePercentage || 10;
      }
    }

    const votes = await Vote.find({ awardId, paymentStatus: 'completed' });
    const votingRevenue = votes.reduce((sum, v) => sum + (v.amount || 0), 0);

    const payments = await Payment.find({ awardId, status: 'completed' });
    const nominationRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const totalRevenue = votingRevenue + nominationRevenue;
    const platformFee = totalRevenue * (serviceFeePercentage / 100);
    const organizerShare = totalRevenue - platformFee;
    const query: any = { awardId, status: 'successful' };
    if (decoded.role === 'organization') {
      query.organizationId = decoded.id;
    }

    const existingTransfers = await Transfer.find(query);
    const alreadyTransferred = existingTransfers.reduce((sum, t) => sum + t.amount, 0);

    const availableAmount = Math.max(0, organizerShare - alreadyTransferred);

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        platformFee,
        organizerShare,
        alreadyTransferred,
        availableAmount,
        serviceFeePercentage,
      },
    });
  } catch (error: any) {
    console.error('Get revenue info error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch revenue info', details: error.message },
      { status: 500 }
    );
  }
}
