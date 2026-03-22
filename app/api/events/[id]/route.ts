import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Event from '@/models/Event';
import { withAuth } from '@/middleware/auth';

connectDB().catch(() => {});

async function getEvent(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = (req as any).user;
    const { id } = await params;

    const orgId = String(user.role === 'org-admin' ? user.organizationId : user.id);
    const event = await Event.findOne({ _id: id, organizationId: orgId }).lean();
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: event });
  } catch (error: any) {
    console.error('[GET /api/events/[id]]', error);
    return NextResponse.json({ error: 'Failed to fetch event', details: error.message }, { status: 500 });
  }
}

async function updateEvent(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = (req as any).user;
    const { id } = await params;
    const body = await req.json();

    const orgId = String(user.role === 'org-admin' ? user.organizationId : user.id);

    const allowedFields = [
      'title', 'description', 'category', 'banner', 'ticketBg', 'ticketTextColor', 'venue',
      'startDate', 'endDate', 'startTime', 'endTime',
      'ticketTypes', 'settings', 'status',
    ];

    const $set: Record<string, any> = {};
    allowedFields.forEach((field) => {
      if (body[field] !== undefined) $set[field] = body[field];
    });

    const updated = await Event.findOneAndUpdate(
      { _id: id, organizationId: orgId },
      { $set },
      { new: true, runValidators: false, strict: false }
    );

    if (!updated) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Event updated successfully', data: updated });
  } catch (error: any) {
    console.error('[PUT /api/events/[id]]', error);
    return NextResponse.json({ error: 'Failed to update event', details: error.message }, { status: 500 });
  }
}

async function deleteEvent(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = (req as any).user;
    const { id } = await params;

    const orgId = String(user.role === 'org-admin' ? user.organizationId : user.id);
    const event = await Event.findOneAndDelete({ _id: id, organizationId: orgId });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Event deleted successfully' });
  } catch (error: any) {
    console.error('[DELETE /api/events/[id]]', error);
    return NextResponse.json({ error: 'Failed to delete event', details: error.message }, { status: 500 });
  }
}

export const GET = withAuth(getEvent);
export const PUT = withAuth(updateEvent);
export const DELETE = withAuth(deleteEvent);
