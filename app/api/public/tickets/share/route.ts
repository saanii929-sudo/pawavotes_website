import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import TicketOrder from '@/models/TicketOrder';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

connectDB().catch(() => {});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(`ticket-share:${ip}`, 20, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Try again in ${rl.resetIn} seconds.` },
        { status: 429 }
      );
    }

    await connectDB();

    const body = await req.json();
    const { reference, ticketCode, shareVia, recipient } = body;

    if (!reference || !ticketCode || !shareVia || !recipient) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!['email', 'whatsapp'].includes(shareVia)) {
      return NextResponse.json({ error: 'Invalid share method' }, { status: 400 });
    }
    if (shareVia === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Verify the order exists and the ticket code belongs to it
    const order = await TicketOrder.findOne({
      reference,
      status: 'completed',
      ticketCodes: ticketCode,
    });
    if (!order) {
      return NextResponse.json({ error: 'Order or ticket not found' }, { status: 404 });
    }

    // Atomic update: only push if this code isn't already in sharedCodes
    // The query filter `sharedCodes.code: { $ne: ticketCode }` acts as the guard
    const updated = await TicketOrder.findOneAndUpdate(
      {
        reference,
        status: 'completed',
        ticketCodes: ticketCode,
        'sharedCodes.code': { $ne: ticketCode },
      },
      {
        $push: {
          sharedCodes: {
            code: ticketCode,
            sharedTo: recipient,
            sharedVia: shareVia,
            sharedAt: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!updated) {
      // findOneAndUpdate returned null — the ticket was already shared
      return NextResponse.json({ error: 'This ticket has already been transferred' }, { status: 409 });
    }

    // Email share — send a link so the recipient can view/download just their ticket
    if (shareVia === 'email') {
      const appUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const ticketUrl = `${appUrl}/ticket-download?code=${encodeURIComponent(ticketCode)}&ref=${encodeURIComponent(reference)}`;
      const { sendEmail } = await import('@/lib/email');
      sendEmail({
        to: recipient,
        subject: `🎟️ ${updated.buyerName} sent you a ticket for ${updated.eventTitle}`,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:40px 16px;background:#f0f2f5;">
            <div style="background:#fff;border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
              <p style="font-size:22px;font-weight:800;color:#111;margin:0 0 8px 0;">You've received a ticket! 🎉</p>
              <p style="font-size:15px;color:#555;margin:0 0 24px 0;"><strong>${updated.buyerName}</strong> has transferred a ticket to you for <strong>${updated.eventTitle}</strong>.</p>
              <a href="${ticketUrl}" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;font-size:15px;padding:14px 28px;border-radius:10px;text-decoration:none;">View &amp; Download Ticket</a>
              <p style="font-size:12px;color:#aaa;margin:24px 0 0 0;">Or copy this link: <a href="${ticketUrl}" style="color:#16a34a;">${ticketUrl}</a></p>
            </div>
          </div>`,
        text: `${updated.buyerName} sent you a ticket for ${updated.eventTitle}.\n\nView and download your ticket here:\n${ticketUrl}`,
      }).catch(() => {});

      return NextResponse.json({ success: true, shareVia: 'email', recipient });
    }

    // WhatsApp share — return link for client to open
    const appUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const dateStr = updated.eventDate
      ? new Date(updated.eventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';
    const message = [
      `🎟️ Here's your ticket for *${updated.eventTitle}*${dateStr ? ` on ${dateStr}` : ''}!`,
      ``,
      `*Ticket Type:* ${updated.ticketTypeName}`,
      `*Ticket Code:* \`${ticketCode}\``,
      ``,
      `Present this code at the entrance or scan the QR code.`,
      `View & download your ticket: ${appUrl}/ticket-download?code=${encodeURIComponent(ticketCode)}&ref=${reference}`,
      ``,
      `Sent by ${updated.buyerName} via Pawavotes 🎉`,
    ].join('\n');

    // Normalize phone — strip spaces/dashes, ensure country code
    const phone = recipient.replace(/[\s\-\(\)]/g, '');
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    return NextResponse.json({ success: true, shareVia: 'whatsapp', whatsappUrl, recipient });
  } catch (error: any) {
    console.error('[POST /api/public/tickets/share]', error);
    return NextResponse.json({ error: 'Failed to share ticket' }, { status: 500 });
  }
}
