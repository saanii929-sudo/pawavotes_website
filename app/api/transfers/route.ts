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
    const query: any = { awardId };

    if (decoded.role === 'organization') {
      query.organizationId = decoded.id;
    }
    
    const transfers = await Transfer.find(query)
      .sort({ createdAt: -1 })
      .lean();
    
    return NextResponse.json({
      success: true,
      data: transfers,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transfers', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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

    if (decoded.role !== 'organization') {
      return NextResponse.json(
        { error: 'Only organizations can request transfers' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      awardId,
      amount: requestedAmount,
      recipientName,
      transferType,
      recipientBank,
      recipientAccountNumber,
      recipientPhoneNumber,
      momoNetwork,
    } = body;

    if (!awardId || !recipientName || !transferType || !requestedAmount) {
      return NextResponse.json(
        { error: 'Award ID, amount, recipient name, and transfer type are required' },
        { status: 400 }
      );
    }

    const transferAmount = parseFloat(requestedAmount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid transfer amount' },
        { status: 400 }
      );
    }

    if (transferType === 'bank' && (!recipientBank || !recipientAccountNumber)) {
      return NextResponse.json(
        { error: 'Bank name and account number are required for bank transfers' },
        { status: 400 }
      );
    }

    if (transferType === 'mobile_money' && (!recipientPhoneNumber || !momoNetwork)) {
      return NextResponse.json(
        { error: 'Phone number and network are required for mobile money transfers' },
        { status: 400 }
      );
    }

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
    const serviceFeePercentage = organization?.serviceFeePercentage || 10;

    // Calculate revenue
    const votes = await Vote.find({ awardId, paymentStatus: 'completed' });
    const votingRevenue = votes.reduce((sum, v) => sum + (v.amount || 0), 0);

    const payments = await Payment.find({ awardId, status: 'completed' });
    const nominationRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const totalRevenue = votingRevenue + nominationRevenue;
    const platformFee = totalRevenue * (serviceFeePercentage / 100);
    const organizerShare = totalRevenue - platformFee;

    if (organizerShare <= 0) {
      return NextResponse.json(
        { error: 'No funds available for transfer' },
        { status: 400 }
      );
    }

    // Get all transfers for this award
    const allTransfers = await Transfer.find({
      awardId,
      organizationId: decoded.id,
    });

    // Calculate already transferred (completed transfers only)
    const completedTransfers = allTransfers.filter(t => t.status === 'completed');
    const alreadyTransferred = completedTransfers.reduce((sum, t) => sum + t.amount, 0);

    // Calculate total requested (pending + approved transfers)
    const pendingAndApprovedTransfers = allTransfers.filter(
      t => t.status === 'pending' || t.status === 'approved'
    );
    const totalRequested = pendingAndApprovedTransfers.reduce((sum, t) => sum + t.amount, 0);

    // Available balance = organizer share - already transferred - total requested
    const availableAmount = organizerShare - alreadyTransferred - totalRequested;

    if (availableAmount <= 0) {
      return NextResponse.json(
        { error: 'No available funds. All funds have been transferred or are pending transfer.' },
        { status: 400 }
      );
    }

    if (transferAmount > availableAmount) {
      return NextResponse.json(
        { 
          error: `Requested amount (GHS ${transferAmount.toFixed(2)}) exceeds available balance (GHS ${availableAmount.toFixed(2)})`,
          details: {
            totalRevenue: totalRevenue.toFixed(2),
            platformFee: platformFee.toFixed(2),
            organizerShare: organizerShare.toFixed(2),
            alreadyTransferred: alreadyTransferred.toFixed(2),
            totalRequested: totalRequested.toFixed(2),
            availableAmount: availableAmount.toFixed(2),
          }
        },
        { status: 400 }
      );
    }

    const referenceId = `TRF_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`;

    const transfer = await Transfer.create({
      referenceId,
      awardId,
      organizationId: decoded.id,
      amount: transferAmount,
      platformFee,
      totalRevenue,
      currency: 'GHS',
      recipientName,
      recipientBank: transferType === 'bank' ? recipientBank : undefined,
      recipientAccountNumber: transferType === 'bank' ? recipientAccountNumber : undefined,
      recipientPhoneNumber: transferType === 'mobile_money' ? recipientPhoneNumber : undefined,
      momoNetwork: transferType === 'mobile_money' ? momoNetwork : undefined,
      transferType,
      status: 'pending',
      initiatedBy: decoded.email || decoded.id,
      notes: transferType === 'mobile_money' ? `Network: ${momoNetwork}` : undefined,
    });

    console.log('Transfer request created:', {
      referenceId,
      requestedAmount: transferAmount,
      availableAmount,
      organizationId: decoded.id,
    });

    // Send email notification to super admin
    try {
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/emails/transfer-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transferId: transfer._id,
          referenceId,
          organizationName: organization?.name || 'Unknown Organization',
          awardName: award.name,
          amount: transferAmount,
          recipientName,
          transferType,
          recipientDetails: transferType === 'bank' 
            ? `${recipientBank} - ${recipientAccountNumber}`
            : `${momoNetwork} - ${recipientPhoneNumber}`,
        }),
      });

      if (!emailResponse.ok) {
        console.error('Failed to send email notification');
      }
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
      // Don't fail the transfer request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Transfer request submitted successfully. It will be reviewed by the platform administrator.',
      data: {
        transfer,
        totalRevenue,
        platformFee,
        organizerShare,
        alreadyTransferred,
        availableAmount,
        requestedAmount: transferAmount,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Failed to create transfer', details: error.message },
      { status: 500 }
    );
  }
}
