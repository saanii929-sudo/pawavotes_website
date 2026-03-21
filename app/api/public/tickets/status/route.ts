import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import TicketOrder from '@/models/TicketOrder';

export const dynamic = 'force-dynamic';

connectDB().catch(() => {});

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const ref = searchParams.get('ref');

    if (!ref) {
      return NextResponse.json({ error: 'Reference required' }, { status: 400 });
    }

    // Exclude only internal/sensitive fields; include everything else (including sharedCodes)
    const order = await TicketOrder.findOne({ reference: ref })
      .select('-paymentData -__v')
      .lean();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error: any) {
    console.error('[GET /api/public/tickets/status]', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}
