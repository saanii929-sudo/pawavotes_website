import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import EventOrganizer from '@/models/EventOrganizer';
import { hashPassword } from '@/lib/auth';
import { withAuth } from '@/middleware/auth';

async function getEventOrganizer(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const organizer = await EventOrganizer.findById(id).select('-password').lean();
    if (!organizer) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: organizer });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch organizer' }, { status: 500 });
  }
}

async function updateEventOrganizer(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    const { name, phone, status, password } = body;

    const $set: any = {};
    if (name?.trim()) $set.name = name.trim();
    if (phone !== undefined) $set.phone = phone.trim();
    if (status && ['active', 'inactive', 'suspended'].includes(status)) $set.status = status;
    if (password?.trim()) $set.password = await hashPassword(password.trim());

    const updated = await EventOrganizer.findByIdAndUpdate(id, { $set }, { new: true }).select('-password').lean();
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ success: true, message: 'Event organizer updated', data: updated });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update organizer' }, { status: 500 });
  }
}

async function deleteEventOrganizer(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const deleted = await EventOrganizer.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Event organizer deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete organizer' }, { status: 500 });
  }
}

export const GET = withAuth(getEventOrganizer, 'superadmin');
export const PUT = withAuth(updateEventOrganizer, 'superadmin');
export const DELETE = withAuth(deleteEventOrganizer, 'superadmin');
