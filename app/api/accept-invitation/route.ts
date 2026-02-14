import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import OrganizationAdmin from '@/models/OrganizationAdmin';

// POST accept invitation
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      );
    }

    // Find admin by invitation token
    const admin = await OrganizationAdmin.findOne({
      invitationToken: token,
    }).populate('organizationId', 'name');

    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      );
    }

    // Check if token is expired
    if (admin.invitationExpiry && admin.invitationExpiry < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      );
    }

    // Check if already accepted
    if (admin.status === 'active') {
      return NextResponse.json(
        { error: 'Invitation has already been accepted' },
        { status: 400 }
      );
    }

    // Activate admin account
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
    console.error('Accept invitation error:', error);
    return NextResponse.json(
      { error: 'Failed to accept invitation', details: error.message },
      { status: 500 }
    );
  }
}

// GET verify invitation token
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

    // Check if token is expired
    if (admin.invitationExpiry && admin.invitationExpiry < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      );
    }

    // Check if already accepted
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
    console.error('Verify invitation error:', error);
    return NextResponse.json(
      { error: 'Failed to verify invitation', details: error.message },
      { status: 500 }
    );
  }
}
