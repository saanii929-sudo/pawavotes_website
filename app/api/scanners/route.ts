import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Scanner from '@/models/Scanner';
import Event from '@/models/Event';
import { verifyToken, hashPassword } from '@/lib/auth';
import { getOrgAdminEventIds } from '@/lib/org-admin-events';

function getUser(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.slice(7));
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// GET /api/scanners — list scanners (scoped to creator)
export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allowed = ['organization', 'org-admin', 'event-organizer'];
  if (!allowed.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();

  const scanners = await Scanner.find({ createdBy: user.id })
    .select('-password')
    .sort({ createdAt: -1 })
    .lean();

  // Enrich with event titles
  const allEventIds = [...new Set(scanners.flatMap((s: any) => s.assignedEvents))];
  const events = allEventIds.length
    ? await Event.find({ _id: { $in: allEventIds } }).select('_id title').lean()
    : [];
  const eventMap = Object.fromEntries(events.map((e: any) => [e._id.toString(), e.title]));

  const enriched = scanners.map((s: any) => ({
    ...s,
    assignedEventTitles: (s.assignedEvents || []).map((id: string) => eventMap[id] || id),
  }));

  return NextResponse.json({ scanners: enriched });
}

// POST /api/scanners — create scanner
export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allowed = ['organization', 'org-admin', 'event-organizer'];
  if (!allowed.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();

  const body = await req.json();
  const { name, email, phone } = body;
  let { assignedEvents } = body;

  if (!name || !email) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
  }

  // Org-admins can only assign scanners to their permitted events
  if (user.role === 'org-admin' && assignedEvents?.length) {
    const permitted = await getOrgAdminEventIds(String(user.id), String((user as any).organizationId));
    assignedEvents = (assignedEvents as string[]).filter((id) => permitted.includes(id));
  }

  const exists = await Scanner.findOne({ email: email.toLowerCase().trim() });
  if (exists) {
    return NextResponse.json({ error: 'A scanner with this email already exists' }, { status: 409 });
  }

  const plainPassword = generatePassword();
  const hashedPw = await hashPassword(plainPassword);

  const scanner = await Scanner.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password: hashedPw,
    phone: phone?.trim(),
    assignedEvents: assignedEvents || [],
    createdBy: user.id,
    createdByRole: user.role,
  });

  return NextResponse.json({
    success: true,
    scanner: {
      _id: scanner._id,
      name: scanner.name,
      email: scanner.email,
      phone: scanner.phone,
      status: scanner.status,
      assignedEvents: scanner.assignedEvents,
    },
    plainPassword, // shown once to the creator
  });
}
