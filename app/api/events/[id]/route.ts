import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Event from '@/models/Event';
import { getOrgAdminEventIds } from '@/lib/org-admin-events';
import { withAuth } from '@/middleware/auth';

connectDB().catch(() => {});

async function getEvent(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = (req as any).user;
    const { id } = await params;

    let eventFilter: any;
    if (user.role === 'event-organizer') {
      eventFilter = { _id: id, managedBy: String(user.id) };
    } else if (user.role === 'org-admin') {
      // Verify this specific event is in the admin's assigned list
      const assignedEventIds = await getOrgAdminEventIds(String(user.id), String(user.organizationId));
      if (!assignedEventIds.includes(id)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      eventFilter = { _id: id };
    } else {
      eventFilter = { _id: id, organizationId: String(user.id) };
    }
    const event = await Event.findOne(eventFilter).lean();
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

    // Only the true owner (organization or event-organizer) may write; org-admins are read-only
    if (user.role === 'org-admin') {
      return NextResponse.json({ error: 'Org-admins cannot edit events' }, { status: 403 });
    }
    const orgId = user.role === 'event-organizer' ? String(user.id) : String(user.id);

    const allowedFields = [
      'title', 'description', 'category', 'banner', 'ticketBg', 'ticketTextColor', 'venue',
      'startDate', 'endDate', 'startTime', 'endTime',
      'ticketTypes', 'settings', 'status',
    ];

    const $set: Record<string, any> = {};
    allowedFields.forEach((field) => {
      if (body[field] !== undefined) $set[field] = body[field];
    });

    const ownerFilter = user.role === 'event-organizer'
      ? { _id: id, managedBy: orgId }
      : { _id: id, organizationId: orgId };
    const updated = await Event.findOneAndUpdate(
      ownerFilter,
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

    if (user.role === 'org-admin') {
      return NextResponse.json({ error: 'Org-admins cannot delete events' }, { status: 403 });
    }
    const orgId = String(user.id);
    const deleteFilter = user.role === 'event-organizer'
      ? { _id: id, managedBy: orgId }
      : { _id: id, organizationId: orgId };
    const event = await Event.findOneAndDelete(deleteFilter);
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
