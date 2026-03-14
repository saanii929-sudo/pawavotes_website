import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import OrganizationAdmin from '@/models/OrganizationAdmin';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(`accept-invite:${ip}`, 5, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
    }

    await connectDB();

    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      );
    }
    const admin = await OrganizationAdmin.findOne({
      invitationToken: token,
    }).populate('organizationId', 'name');

    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      );
    }
    if (admin.invitationExpiry && admin.invitationExpiry < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      );
    }
    if (admin.status === 'active') {
      return NextResponse.json(
        { error: 'Invitation has already been accepted' },
        { status: 400 }
      );
    }
    admin.status = 'active';
    admin.invitationToken = undefined;
    admin.invitationExpiry = undefined;
    await admin.save();

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted successfully',
      data: {
        email: admin.email,
        name: admin.name,
        organizationName: (admin.organizationId as any)?.name,
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
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const admin = await OrganizationAdmin.findOne({
      invitationToken: token,
    }).populate('organizationId', 'name');

    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      );
    }
    if (admin.invitationExpiry && admin.invitationExpiry < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      );
    }
    if (admin.status === 'active') {
      return NextResponse.json(
        { error: 'Invitation has already been accepted' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        email: admin.email,
        name: admin.name,
        organizationName: (admin.organizationId as any)?.name,
        expiryDate: admin.invitationExpiry,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to verify invitation', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
