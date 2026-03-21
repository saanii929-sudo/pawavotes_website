import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import EventModel from '@/models/Event';

connectDB().catch(() => {});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;

    const event = await EventModel.findOne({
      _id: id,
      status: { $in: ['published', 'ongoing'] },
      'settings.isPublic': true,
    })
      .select('-organizationId -createdBy')
      .lean();

    if (!event) {
      return NextResponse.json({ error: 'Event not found or not available' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: event });
  } catch (error: any) {
    console.error('[GET /api/public/events/[id]]', error);
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}
