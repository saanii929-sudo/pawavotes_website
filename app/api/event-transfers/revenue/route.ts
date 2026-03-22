import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import EventTransfer from '@/models/EventTransfer';
import EventModel from '@/models/Event';
import TicketOrder from '@/models/TicketOrder';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const eventId = req.nextUrl.searchParams.get('eventId');
    if (!eventId) {
      return NextResponse.json({ error: 'eventId query parameter is required' }, { status: 400 });
    }

    const ownerId = String(decoded.id);

    // Verify event ownership
    const ownerFilter = decoded.role === 'event-organizer'
      ? { _id: eventId, managedBy: ownerId }
      : { _id: eventId, organizationId: ownerId };

    const event = await EventModel.findOne(ownerFilter).lean();
    if (!event) {
      return NextResponse.json({ error: 'Event not found or access denied' }, { status: 404 });
    }

    // Service fee
    let serviceFeePercentage = 10;
    if (decoded.role === 'organization') {
      const Organization = (await import('@/models/Organization')).default;
      const org = await Organization.findById(ownerId);
      serviceFeePercentage = org?.serviceFeePercentage || 10;
    }

    // Ticket revenue for this specific event
    const ticketAgg = await TicketOrder.aggregate([
      { $match: { eventId: eventId, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, tickets: { $sum: '$quantity' } } },
    ]);
    const totalRevenue = ticketAgg[0]?.total || 0;
    const ticketsSold = ticketAgg[0]?.tickets || 0;

    const platformFee = totalRevenue * (serviceFeePercentage / 100);
    const organizerShare = totalRevenue - platformFee;

    const allTransfers = await EventTransfer.find({ eventId, ownerId });
    const alreadyTransferred = allTransfers.filter(t => t.status === 'completed').reduce((s, t) => s + t.amount, 0);
    const totalRequested = allTransfers.filter(t => t.status === 'pending' || t.status === 'approved').reduce((s, t) => s + t.amount, 0);
    const availableAmount = Math.max(0, organizerShare - alreadyTransferred - totalRequested);

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        platformFee,
        organizerShare,
        alreadyTransferred,
        totalRequested,
        availableAmount,
        serviceFeePercentage,
        ticketsSold,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch revenue info' }, { status: 500 });
  }
}
