import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import OrganizationAdmin from '@/models/OrganizationAdmin';
import Award from '@/models/Award';
import jwt from 'jsonwebtoken';
import { hashPassword } from '@/lib/auth';
import { sendInvitationEmail, generateRandomPassword, generateInvitationToken } from '@/lib/email';

const JWT_SECRET = process.env.JWT_SECRET!;

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== 'organization') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    await connectDB();

    const admins = await OrganizationAdmin.find({ organizationId: decoded.id })
      .populate('assignedAwards', 'name')
      .select('-password')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: admins,
    });
  } catch (error: any) {
    console.error('Get admins error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admins', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

// POST create and invite new admin
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== 'organization') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await req.json();
    const { name, email, assignedAwards } = body;

    // Validation
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Check if admin already exists
    const existingAdmin = await OrganizationAdmin.findOne({ email });
    if (existingAdmin) {
      return NextResponse.json(
        { error: 'An admin with this email already exists' },
        { status: 400 }
      );
    }

    // Verify assigned awards belong to this organization
    if (assignedAwards && assignedAwards.length > 0) {
      const awards = await Award.find({
        _id: { $in: assignedAwards },
        organizationId: decoded.id,
      });

      if (awards.length !== assignedAwards.length) {
        return NextResponse.json(
          { error: 'Some awards do not belong to your organization' },
          { status: 400 }
        );
      }
    }

    // Generate random password and token
    const randomPassword = generateRandomPassword();
    const hashedPassword = await hashPassword(randomPassword);
    const invitationToken = generateInvitationToken();
    const invitationExpiry = new Date();
    invitationExpiry.setDate(invitationExpiry.getDate() + 7); // 7 days expiry

    // Create admin
    const admin = await OrganizationAdmin.create({
      organizationId: decoded.id,
      name,
      email,
      password: hashedPassword,
      assignedAwards: assignedAwards || [],
      invitationToken,
      invitationExpiry,
      invitedBy: decoded.id,
      status: 'pending',
    });

    // Get organization name for email
    const Organization = require('@/models/Organization').default;
    const organization = await Organization.findById(decoded.id);

    // Build invitation link
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const invitationLink = `${baseUrl}/accept-invitation?token=${invitationToken}`;

    
    const emailSent = await sendInvitationEmail(
      email,
      name,
      organization?.name || 'Organization',
      invitationLink,
      randomPassword
    );

    if (!emailSent) {
      console.warn('Failed to send invitation email');
    }

    const adminData = await OrganizationAdmin.findById(admin._id)
      .populate('assignedAwards', 'name')
      .select('-password');

    return NextResponse.json({
      success: true,
      message: 'Admin invited successfully',
      data: adminData,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Create admin error:', error);
    return NextResponse.json(
      { error: 'Failed to create admin', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
