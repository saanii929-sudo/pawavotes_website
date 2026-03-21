import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import EventModel from '@/models/Event';
import TicketOrder from '@/models/TicketOrder';
import crypto from 'crypto';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sendTicketConfirmationEmail } from '@/lib/email';

connectDB().catch(() => {});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(`ticket-purchase:${ip}`, 10, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Try again in ${rl.resetIn} seconds.` },
        { status: 429 }
      );
    }

    await connectDB();

    const body = await req.json();
    const { eventId, ticketTypeId, quantity, buyerName, buyerEmail, buyerPhone } = body;

    // Validate required fields
    if (!eventId || !ticketTypeId || !quantity || !buyerName || !buyerEmail || !buyerPhone) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }
    if (typeof quantity !== 'number' || quantity < 1 || quantity > 20) {
      return NextResponse.json({ error: 'Quantity must be between 1 and 20' }, { status: 400 });
    }

    // Fetch the event
    const event = await EventModel.findOne({
      _id: eventId,
      status: { $in: ['published', 'ongoing'] },
      'settings.isPublic': true,
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found or not available' }, { status: 404 });
    }

    // Find the specific ticket type
    const ticketType = event.ticketTypes.find((t) => t.id === ticketTypeId);
    if (!ticketType) {
      return NextResponse.json({ error: 'Ticket type not found' }, { status: 404 });
    }

    // Check availability
    const available = ticketType.capacity - ticketType.sold;
    if (available < quantity) {
      return NextResponse.json(
        { error: `Only ${available} ticket${available === 1 ? '' : 's'} remaining for this ticket type` },
        { status: 400 }
      );
    }

    const unitPrice = ticketType.price;
    const totalAmount = unitPrice * quantity;
    const reference = `TKT${Date.now()}${crypto.randomBytes(2).toString('hex')}`.substring(0, 32);

    // Build venue strings for storage
    const venueName = event.venue?.isVirtual ? 'Virtual Event' : (event.venue?.name || '');
    const venueAddress = event.venue?.isVirtual
      ? (event.venue?.virtualLink || '')
      : [event.venue?.address, event.venue?.city, event.venue?.country].filter(Boolean).join(', ');

    // Create pending order
    await TicketOrder.create({
      reference,
      eventId: String(event._id),
      eventTitle: event.title,
      eventDate: event.startDate?.toISOString(),
      eventTime: event.startTime || '',
      venueName,
      venueAddress,
      ticketTypeId,
      ticketTypeName: ticketType.name,
      ticketTypeColor: ticketType.color,
      quantity,
      unitPrice,
      totalAmount,
      buyerName: buyerName.trim(),
      buyerEmail: buyerEmail.toLowerCase().trim(),
      buyerPhone: buyerPhone.trim(),
      status: 'pending',
    });

    // Free ticket — skip payment, confirm immediately
    if (unitPrice === 0) {
      // Generate ticket codes
      const ticketCodes = Array.from({ length: quantity }, (_, i) =>
        `${event.code}-${Date.now()}-${i + 1}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
      );

      // Mark order as completed
      await TicketOrder.findOneAndUpdate(
        { reference },
        { status: 'completed', ticketCodes }
      );

      // Increment sold count on the event
      await EventModel.findOneAndUpdate(
        { _id: eventId, 'ticketTypes.id': ticketTypeId },
        { $inc: { 'ticketTypes.$.sold': quantity, totalSold: quantity } }
      );

      // Send ticket email (non-blocking)
      sendTicketConfirmationEmail({
        buyerName,
        buyerEmail,
        eventTitle: event.title,
        ticketTypeName: ticketType.name,
        ticketTypeColor: ticketType.color,
        quantity,
        unitPrice: 0,
        totalAmount: 0,
        ticketCodes,
        eventDate: event.startDate.toISOString(),
        eventTime: event.startTime,
        venueName: event.venue.isVirtual ? 'Virtual Event' : event.venue.name,
        venueAddress: event.venue.isVirtual
          ? (event.venue.virtualLink || '')
          : [event.venue.address, event.venue.city, event.venue.country].filter(Boolean).join(', '),
        reference,
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        free: true,
        reference,
        message: 'Free tickets confirmed! Check your email.',
      });
    }

    // Paid ticket — initialize Hubtel payment
    const hubtelApiId = process.env.HUBTEL_API_ID;
    const hubtelApiKey = process.env.HUBTEL_API_KEY;
    const hubtelMerchantAccount = process.env.HUBTEL_MERCHANT_ACCOUNT;
    const appUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const callbackUrl = process.env.HUBTEL_CALLBACK_URL || `${appUrl}/api/webhooks/hubtel`;
    const returnUrl = `${appUrl}/ticket-success?ref=${reference}`;
    const cancellationUrl = `${appUrl}/ticketing/${eventId}?cancelled=1`;

    if (!hubtelApiId || !hubtelApiKey || !hubtelMerchantAccount) {
      return NextResponse.json({ error: 'Payment system not configured' }, { status: 500 });
    }

    const hubtelPayload = {
      totalAmount,
      description: `${quantity}× ${ticketType.name} — ${event.title}`,
      callbackUrl,
      returnUrl,
      merchantAccountNumber: hubtelMerchantAccount,
      cancellationUrl,
      clientReference: reference,
      payeeName: buyerName.trim(),
      payeeEmail: buyerEmail.toLowerCase().trim(),
      payeeMobileNumber: buyerPhone.trim(),
    };

    const base64Auth = Buffer.from(`${hubtelApiId}:${hubtelApiKey}`).toString('base64');
    const hubtelResponse = await fetch('https://payproxyapi.hubtel.com/items/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${base64Auth}`,
      },
      body: JSON.stringify(hubtelPayload),
    });

    if (hubtelResponse.status === 401) {
      return NextResponse.json({ error: 'Payment system temporarily unavailable' }, { status: 500 });
    }

    const responseText = await hubtelResponse.text();
    let hubtelData: any;
    try {
      hubtelData = JSON.parse(responseText);
    } catch {
      return NextResponse.json({ error: 'Failed to initialize payment' }, { status: 500 });
    }

    if (!hubtelResponse.ok || hubtelData.responseCode !== '0000') {
      return NextResponse.json({ error: 'Failed to initialize payment' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      free: false,
      reference,
      checkoutUrl: hubtelData.data.checkoutUrl,
      checkoutDirectUrl: hubtelData.data.checkoutDirectUrl,
      message: 'Payment initialized successfully',
    });
  } catch (error: any) {
    console.error('[POST /api/public/tickets/purchase]', error);
    return NextResponse.json({ error: 'Failed to process purchase', details: error.message }, { status: 500 });
  }
}

