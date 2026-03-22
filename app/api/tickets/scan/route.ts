import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import TicketOrder from '@/models/TicketOrder';
import TicketScan from '@/models/TicketScan';
import Scanner from '@/models/Scanner';
import Event from '@/models/Event';
import { verifyToken } from '@/lib/auth';

function getUser(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.slice(7));
}

/** Combines event endDate + endTime to produce the actual end moment */
function getEventEndDateTime(event: any): Date {
  const d = new Date(event.endDate);
  const [h, m] = (event.endTime || '23:59').split(':').map(Number);
  d.setHours(h, m, 59, 999);
  return d;
}

// GET /api/tickets/scan?code=XXX — check status without recording a scan
export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user || user.role !== 'scanner') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();

  const code = req.nextUrl.searchParams.get('code')?.trim();
  if (!code) return NextResponse.json({ error: 'Ticket code is required' }, { status: 400 });

  const order = await TicketOrder.findOne({ ticketCodes: code, status: 'completed' }).lean() as any;
  if (!order) return NextResponse.json({ error: 'Ticket not found or not valid' }, { status: 404 });

  const event = await Event.findById(order.eventId).lean() as any;
  const eventEnded = event ? new Date() > getEventEndDateTime(event) : false;
  const isCheckedIn = (order.checkedInCodes || []).includes(code);

  return NextResponse.json({
    valid: !eventEnded,
    eventEnded,
    isCheckedIn,
    ticket: {
      code,
      buyerName: order.buyerName,
      buyerPhone: order.buyerPhone,
      ticketTypeName: order.ticketTypeName,
      eventTitle: order.eventTitle,
      eventDate: order.eventDate,
      eventTime: order.eventTime,
      venueName: order.venueName,
    },
    event: event ? { title: event.title, endDate: event.endDate, endTime: event.endTime } : null,
  });
}

// POST /api/tickets/scan — perform check-in or check-out
export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user || user.role !== 'scanner') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();

  const body = await req.json();
  const { code, action } = body as { code: string; action: 'check-in' | 'check-out' };

  if (!code || !action) {
    return NextResponse.json({ error: 'code and action are required' }, { status: 400 });
  }
  if (!['check-in', 'check-out'].includes(action)) {
    return NextResponse.json({ error: 'action must be check-in or check-out' }, { status: 400 });
  }

  const scanner = await Scanner.findById(user.id);
  if (!scanner || scanner.status !== 'active') {
    return NextResponse.json({ error: 'Scanner account is inactive' }, { status: 403 });
  }

  const order = await TicketOrder.findOne({ ticketCodes: code, status: 'completed' }) as any;
  if (!order) {
    return NextResponse.json({ error: 'Ticket not found or payment incomplete', valid: false }, { status: 404 });
  }

  // Verify scanner is assigned to this event
  if (scanner.assignedEvents.length > 0 && !scanner.assignedEvents.includes(order.eventId.toString())) {
    return NextResponse.json({ error: 'You are not assigned to this event', valid: false }, { status: 403 });
  }

  const event = await Event.findById(order.eventId).lean() as any;
  if (!event) {
    return NextResponse.json({ error: 'Event not found', valid: false }, { status: 404 });
  }

  const eventEnded = new Date() > getEventEndDateTime(event);

  // If event has ended — ticket is invalid for any action
  if (eventEnded) {
    return NextResponse.json({
      valid: false,
      eventEnded: true,
      message: 'This event has ended. Ticket is no longer valid.',
      ticket: {
        code,
        buyerName: order.buyerName,
        ticketTypeName: order.ticketTypeName,
        eventTitle: order.eventTitle,
      },
    });
  }

  const checkedInCodes: string[] = order.checkedInCodes || [];
  const isCheckedIn = checkedInCodes.includes(code);

  if (action === 'check-in') {
    if (isCheckedIn) {
      return NextResponse.json({
        valid: false,
        message: 'This ticket has already been checked in.',
        isCheckedIn: true,
        ticket: { code, buyerName: order.buyerName, ticketTypeName: order.ticketTypeName, eventTitle: order.eventTitle },
      });
    }
    await TicketOrder.updateOne({ _id: order._id }, { $addToSet: { checkedInCodes: code } });
  } else {
    // check-out
    if (!isCheckedIn) {
      return NextResponse.json({
        valid: false,
        message: 'This ticket has not been checked in yet.',
        isCheckedIn: false,
        ticket: { code, buyerName: order.buyerName, ticketTypeName: order.ticketTypeName, eventTitle: order.eventTitle },
      });
    }
    await TicketOrder.updateOne({ _id: order._id }, { $pull: { checkedInCodes: code } });
  }

  // Log the scan
  await TicketScan.create({
    ticketCode: code,
    orderId: order._id.toString(),
    eventId: order.eventId,
    eventTitle: order.eventTitle,
    scannerId: user.id,
    scannerName: scanner.name,
    buyerName: order.buyerName,
    ticketTypeName: order.ticketTypeName,
    action,
  });

  return NextResponse.json({
    valid: true,
    action,
    message: action === 'check-in' ? 'Check-in successful!' : 'Check-out successful!',
    ticket: {
      code,
      buyerName: order.buyerName,
      buyerPhone: order.buyerPhone,
      ticketTypeName: order.ticketTypeName,
      eventTitle: order.eventTitle,
      eventDate: order.eventDate,
      venueName: order.venueName,
    },
  });
}
