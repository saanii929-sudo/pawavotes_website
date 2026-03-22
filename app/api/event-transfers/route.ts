import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import EventTransfer from '@/models/EventTransfer';
import EventModel from '@/models/Event';
import TicketOrder from '@/models/TicketOrder';
import { verifyToken } from '@/lib/auth';

const ALLOWED_ROLES = ['organization', 'event-organizer'];

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || !ALLOWED_ROLES.includes(decoded.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const eventId = req.nextUrl.searchParams.get('eventId');
    if (!eventId) {
      return NextResponse.json({ error: 'eventId query parameter is required' }, { status: 400 });
    }

    const transfers = await EventTransfer.find({
      eventId,
      ownerId: String(decoded.id),
    }).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ success: true, data: transfers });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch transfers' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || !ALLOWED_ROLES.includes(decoded.role)) {
      return NextResponse.json({ error: 'Only organizations and event organizers can request transfers' }, { status: 403 });
    }

    const body = await req.json();
    const { eventId, amount: requestedAmount, recipientName, transferType, recipientBank, recipientAccountNumber, recipientPhoneNumber, momoNetwork } = body;

    if (!eventId || !recipientName || !transferType || !requestedAmount) {
      return NextResponse.json({ error: 'Event ID, amount, recipient name, and transfer type are required' }, { status: 400 });
    }

    const transferAmount = parseFloat(requestedAmount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return NextResponse.json({ error: 'Invalid transfer amount' }, { status: 400 });
    }

    if (transferType === 'bank' && (!recipientBank || !recipientAccountNumber)) {
      return NextResponse.json({ error: 'Bank name and account number are required for bank transfers' }, { status: 400 });
    }

    if (transferType === 'mobile_money' && (!recipientPhoneNumber || !momoNetwork)) {
      return NextResponse.json({ error: 'Phone number and network are required for mobile money transfers' }, { status: 400 });
    }

    // Verify event ownership
    const ownerId = String(decoded.id);
    const ownerFilter = decoded.role === 'event-organizer'
      ? { _id: eventId, managedBy: ownerId }
      : { _id: eventId, organizationId: ownerId };

    const event = await EventModel.findOne(ownerFilter).lean();
    if (!event) {
      return NextResponse.json({ error: 'Event not found or access denied' }, { status: 404 });
    }

    // Service fee: 10% for event-organizer, org setting for organization
    let serviceFeePercentage = 10;
    if (decoded.role === 'organization') {
      const Organization = (await import('@/models/Organization')).default;
      const org = await Organization.findById(ownerId);
      serviceFeePercentage = org?.serviceFeePercentage || 10;
    }

    // Revenue from ticket sales
    const ticketAgg = await TicketOrder.aggregate([
      { $match: { eventId: eventId, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const totalRevenue = ticketAgg[0]?.total || 0;
    const platformFee = totalRevenue * (serviceFeePercentage / 100);
    const organizerShare = totalRevenue - platformFee;

    if (organizerShare <= 0) {
      return NextResponse.json({ error: 'No ticket revenue available for transfer' }, { status: 400 });
    }

    // Already transferred / pending
    const allTransfers = await EventTransfer.find({ eventId, ownerId });
    const alreadyTransferred = allTransfers.filter(t => t.status === 'completed').reduce((s, t) => s + t.amount, 0);
    const totalRequested = allTransfers.filter(t => t.status === 'pending' || t.status === 'approved').reduce((s, t) => s + t.amount, 0);
    const availableAmount = organizerShare - alreadyTransferred - totalRequested;

    if (availableAmount <= 0) {
      return NextResponse.json({ error: 'No available funds. All funds have been transferred or are pending.' }, { status: 400 });
    }

    if (transferAmount > availableAmount) {
      return NextResponse.json({
        error: `Requested amount (GHS ${transferAmount.toFixed(2)}) exceeds available balance (GHS ${availableAmount.toFixed(2)})`,
      }, { status: 400 });
    }

    const referenceId = `EVT_TRF_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const transfer = await EventTransfer.create({
      referenceId,
      eventId,
      ownerId,
      ownerRole: decoded.role,
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
      initiatedBy: decoded.email || ownerId,
      notes: transferType === 'mobile_money' ? `Network: ${momoNetwork}` : undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'Transfer request submitted. It will be reviewed by the platform administrator.',
      data: { transfer, totalRevenue, platformFee, organizerShare, alreadyTransferred, availableAmount, requestedAmount: transferAmount },
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to create transfer', details: error.message }, { status: 500 });
  }
}
