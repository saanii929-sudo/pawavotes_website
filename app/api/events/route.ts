import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Event from '@/models/Event';
import Organization from '@/models/Organization';
import { withAuth } from '@/middleware/auth';

connectDB().catch(() => {});

async function getEvents(req: NextRequest) {
  try {
    await connectDB();

    const user = (req as any).user;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const category = searchParams.get('category') || '';

    // Determine which organizationId to query
    const orgId = user.role === 'org-admin' ? String(user.organizationId) : String(user.id);

    const query: any = { organizationId: orgId };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { 'venue.city': { $regex: search, $options: 'i' } },
      ];
    }
    if (status) query.status = status;
    if (category) query.category = category;

    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      Event.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Event.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: events,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    console.error('[GET /api/events]', error);
    return NextResponse.json(
      { error: 'Failed to fetch events', details: error.message },
      { status: 500 }
    );
  }
}

async function createEvent(req: NextRequest) {
  try {
    await connectDB();

    const user = (req as any).user;
    const body = await req.json();

    const {
      title,
      description,
      category,
      banner,
      ticketBg,
      ticketTextColor,
      venue,
      startDate,
      endDate,
      startTime,
      endTime,
      ticketTypes,
      settings,
      status,
    } = body;

    // Basic validation
    if (!title?.trim()) {
      return NextResponse.json({ error: 'Event title is required' }, { status: 400 });
    }
    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start and end dates are required' }, { status: 400 });
    }
    if (!venue?.isVirtual && !venue?.name?.trim()) {
      return NextResponse.json({ error: 'Venue name is required for in-person events' }, { status: 400 });
    }
    if (new Date(startDate) > new Date(endDate)) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
    }

    // Resolve organization name from DB if not in token
    const orgId = String(user.id);
    let orgName: string = user.organizationName || user.name || '';
    if (!orgName) {
      try {
        const org = await Organization.findById(orgId).select('name').lean();
        orgName = (org as any)?.name || 'My Organization';
      } catch {
        orgName = 'My Organization';
      }
    }

    // For virtual events, default the venue name
    const venueData = {
      ...venue,
      name: venue?.isVirtual ? (venue?.name || 'Virtual Event') : venue?.name?.trim(),
    };

    // Sanitize ticket types — ensure each has an id
    const sanitizedTickets = (ticketTypes || []).map((t: any, i: number) => ({
      ...t,
      id: t.id || `ticket-${Date.now()}-${i}`,
      name: t.name?.trim() || `Ticket Type ${i + 1}`,
      price: Number(t.price) || 0,
      capacity: Number(t.capacity) || 100,
      sold: Number(t.sold) || 0,
      color: t.color || '#10b981',
    }));

    const event = await Event.create({
      title: title.trim(),
      description: description?.trim() || '',
      category: category || 'other',
      banner: banner || '',
      ticketBg: ticketBg || '',
      ticketTextColor: ticketTextColor || 'light',
      venue: venueData,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      startTime: startTime || '09:00',
      endTime: endTime || '17:00',
      ticketTypes: sanitizedTickets,
      organizationId: orgId,
      organizationName: orgName,
      createdBy: orgId,
      settings: {
        requireApproval: settings?.requireApproval ?? false,
        showAttendeeCount: settings?.showAttendeeCount ?? true,
        allowRefunds: settings?.allowRefunds ?? false,
        isPublic: settings?.isPublic ?? true,
      },
      status: status || 'draft',
    });

    return NextResponse.json(
      { success: true, message: 'Event created successfully', data: event },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[POST /api/events]', error);
    return NextResponse.json(
      { error: 'Failed to create event', details: error.message },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getEvents);
export const POST = withAuth(createEvent);
