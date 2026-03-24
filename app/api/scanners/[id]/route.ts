import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Scanner from '@/models/Scanner';
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

// GET /api/scanners/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await connectDB();
  const scanner = await Scanner.findOne({ _id: id, createdBy: user.id }).select('-password').lean();
  if (!scanner) return NextResponse.json({ error: 'Scanner not found' }, { status: 404 });

  return NextResponse.json({ scanner });
}

// PUT /api/scanners/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await connectDB();
  const scanner = await Scanner.findOne({ _id: id, createdBy: user.id });
  if (!scanner) return NextResponse.json({ error: 'Scanner not found' }, { status: 404 });

  const body = await req.json();
  const { name, phone, status, resetPassword } = body;
  let { assignedEvents } = body;

  if (name) scanner.name = name.trim();
  if (phone !== undefined) scanner.phone = phone?.trim();
  if (status && ['active', 'inactive', 'suspended'].includes(status)) scanner.status = status;
  if (assignedEvents !== undefined) {
    // Org-admins can only assign scanners to their permitted events
    if (user.role === 'org-admin') {
      const permitted = await getOrgAdminEventIds(String(user.id), String((user as any).organizationId));
      assignedEvents = (assignedEvents as string[]).filter((id: string) => permitted.includes(id));
    }
    scanner.assignedEvents = assignedEvents;
  }

  let plainPassword: string | undefined;
  if (resetPassword) {
    plainPassword = generatePassword();
    scanner.password = await hashPassword(plainPassword);
  }

  await scanner.save();

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
    ...(plainPassword ? { plainPassword } : {}),
  });
}

// DELETE /api/scanners/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await connectDB();
  const scanner = await Scanner.findOneAndDelete({ _id: id, createdBy: user.id });
  if (!scanner) return NextResponse.json({ error: 'Scanner not found' }, { status: 404 });

  return NextResponse.json({ success: true });
}
