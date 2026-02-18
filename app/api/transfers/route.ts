import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Transfer from '@/models/Transfer';
import Vote from '@/models/Vote';
import Payment from '@/models/Payment';
import { verifyToken } from '@/lib/auth';

// GET /api/transfers?awardId=xxx
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      console.error('No token provided');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      console.error('Invalid token');
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    console.log('GET transfers - User:', { id: decoded.id, role: decoded.role });
    
    const awardId = req.nextUrl.searchParams.get('awardId');
    
    if (!awardId) {
      console.error('No awardId provided');
      return NextResponse.json(
        { success: false, message: 'awardId query parameter is required' },
        { status: 400 }
      );
    }

    console.log('Fetching transfers for award:', awardId);

    // Build query based on user role
    const query: any = { awardId };

    // Organizations can only see their own transfers
    if (decoded.role === 'organization') {
      query.organizationId = decoded.id;
      console.log('Filtering by organizationId:', decoded.id);
    }
    // Superadmin can see all transfers (no additional filter needed)
    
    const transfers = await Transfer.find(query)
      .sort({ createdAt: -1 })
      .lean();
    
    console.log('Found transfers:', transfers.length);
    
    return NextResponse.json({
      success: true,
      data: transfers,
    });
  } catch (error: any) {
    console.error('Get transfers error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transfers', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/transfers - Request a withdrawal
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

    // Only organizations can request transfers
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
      transferType, // 'bank' or 'mobile_money'
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

    // Validate requested amount
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

    // Verify the award belongs to this organization
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

    // Get organization's service fee percentage
    const Organization = (await import('@/models/Organization')).default;
    const organization = await Organization.findById(decoded.id);
    const serviceFeePercentage = organization?.serviceFeePercentage || 10;

    // Calculate total revenue for this award
    const votes = await Vote.find({ awardId, paymentStatus: 'completed' });
    const votingRevenue = votes.reduce((sum, v) => sum + (v.amount || 0), 0);

    const payments = await Payment.find({ awardId, status: 'completed' });
    const nominationRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const totalRevenue = votingRevenue + nominationRevenue;

    // Calculate platform fee based on organization's service fee percentage
    const platformFee = totalRevenue * (serviceFeePercentage / 100);
    // Organizer gets the remaining amount
    const organizerShare = totalRevenue - platformFee;

    if (organizerShare <= 0) {
      return NextResponse.json(
        { error: 'No funds available for transfer' },
        { status: 400 }
      );
    }

    // Check if there are already successful transfers for this award by this organization
    const existingTransfers = await Transfer.find({
      awardId,
      organizationId: decoded.id,
      status: 'successful',
    });
    const alreadyTransferred = existingTransfers.reduce((sum, t) => sum + t.amount, 0);

    const availableAmount = organizerShare - alreadyTransferred;

    if (availableAmount <= 0) {
      return NextResponse.json(
        { error: 'All available funds have already been transferred' },
        { status: 400 }
      );
    }

    // Validate requested amount doesn't exceed available amount
    if (transferAmount > availableAmount) {
      return NextResponse.json(
        { error: `Requested amount (GHS ${transferAmount.toFixed(2)}) exceeds available balance (GHS ${availableAmount.toFixed(2)})` },
        { status: 400 }
      );
    }

    // Generate reference ID
    const referenceId = `TRF_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Save transfer request (pending approval) with the requested amount
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

    return NextResponse.json({
      success: true,
      message: 'Transfer request submitted successfully. It will be processed by the platform administrator.',
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
    console.error('Create transfer error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create transfer', details: error.message },
      { status: 500 }
    );
  }
}
