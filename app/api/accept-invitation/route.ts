import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import OrganizationAdmin from '@/models/OrganizationAdmin';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

// Find admin and the index of the org entry that holds this invitation token
async function findAdminByToken(token: string) {
  const admin = await OrganizationAdmin.findOne({
    'organizations.invitationToken': token,
  });
  if (!admin) return { admin: null, idx: -1 };
  const idx = admin.organizations.findIndex((o) => o.invitationToken === token);
  return { admin, idx };
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(`accept-invite:${ip}`, 5, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
    }

    await connectDB();

    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ error: 'Invitation token is required' }, { status: 400 });
    }

    const { admin, idx } = await findAdminByToken(token);
    if (!admin || idx === -1) {
      return NextResponse.json({ error: 'Invalid invitation token' }, { status: 404 });
    }

    const membership = admin.organizations[idx];

    if (membership.invitationExpiry && membership.invitationExpiry < new Date()) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 });
    }
    if (membership.status === 'active') {
      return NextResponse.json({ error: 'Invitation has already been accepted' }, { status: 400 });
    }

    // Activate this org membership using atomic update to avoid TypeScript subdoc issues
    await OrganizationAdmin.findByIdAndUpdate(admin._id, {
      $set: {
        [`organizations.${idx}.status`]: 'active',
        status: 'active', // promote overall admin status
      },
      $unset: {
        [`organizations.${idx}.invitationToken`]: '',
        [`organizations.${idx}.invitationExpiry`]: '',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted successfully',
      data: {
        email: admin.email,
        name: admin.name,
        organizationName: membership.organizationName,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to accept invitation', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Invitation token is required' }, { status: 400 });
    }

    await connectDB();

    const { admin, idx } = await findAdminByToken(token);
    if (!admin || idx === -1) {
      return NextResponse.json({ error: 'Invalid invitation token' }, { status: 404 });
    }

    const membership = admin.organizations[idx];

    if (membership.invitationExpiry && membership.invitationExpiry < new Date()) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 });
    }
    if (membership.status === 'active') {
      return NextResponse.json({ error: 'Invitation has already been accepted' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        email: admin.email,
        name: admin.name,
        organizationName: membership.organizationName,
        expiryDate: membership.invitationExpiry,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to verify invitation', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
