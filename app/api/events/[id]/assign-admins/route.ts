import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import EventModel from '@/models/Event';
import OrganizationAdmin from '@/models/OrganizationAdmin';
import { withAuth } from '@/middleware/auth';

/** GET — list currently assigned org-admins for an event (event-organizer only) */
async function getAssignedAdmins(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = (req as any).user;
    const { id } = await params;

    if (user.role !== 'event-organizer') {
      return NextResponse.json({ error: 'Only event organizers can manage admin assignments' }, { status: 403 });
    }

    const event = await EventModel.findOne({ _id: id, managedBy: String(user.id) }).lean();
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const assignedIds = (event as any).assignedAdmins || [];
    const admins = assignedIds.length
      ? await OrganizationAdmin.find({ _id: { $in: assignedIds } }).select('_id name email status').lean()
      : [];

    return NextResponse.json({ success: true, data: admins });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch assigned admins', details: error.message }, { status: 500 });
  }
}

/**
 * PUT — replace the full assignedAdmins list for an event (event-organizer only).
 * Body: { adminIds: string[] }
 */
async function setAssignedAdmins(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = (req as any).user;
    const { id } = await params;

    if (user.role !== 'event-organizer') {
      return NextResponse.json({ error: 'Only event organizers can assign admins' }, { status: 403 });
    }

    const { adminIds } = await req.json();
    if (!Array.isArray(adminIds)) {
      return NextResponse.json({ error: 'adminIds must be an array' }, { status: 400 });
    }

    // Verify all provided IDs are real org-admins
    const validAdmins = await OrganizationAdmin.find({ _id: { $in: adminIds } }).select('_id name email').lean();
    const validIds = validAdmins.map((a: any) => String(a._id));

    const updated = await EventModel.findOneAndUpdate(
      { _id: id, managedBy: String(user.id) },
      { $set: { assignedAdmins: validIds } },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `${validIds.length} admin(s) assigned`,
      data: validAdmins,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to assign admins', details: error.message }, { status: 500 });
  }
}

export const GET = withAuth(getAssignedAdmins);
export const PUT = withAuth(setAssignedAdmins);
