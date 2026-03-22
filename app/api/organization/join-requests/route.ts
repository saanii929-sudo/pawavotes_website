import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import JoinRequest from '@/models/JoinRequest';
import OrganizationAdmin from '@/models/OrganizationAdmin';
import Organization from '@/models/Organization';

// POST — org-admin sends a join request by org email
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || (decoded as any).role !== 'org-admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { organizationEmail } = await req.json();
    if (!organizationEmail) {
      return NextResponse.json({ error: 'Organization email is required' }, { status: 400 });
    }

    await connectDB();

    // Find the organization by email
    const org = await Organization.findOne({ email: organizationEmail.toLowerCase().trim() });
    if (!org) {
      return NextResponse.json({ error: 'No organization found with that email' }, { status: 404 });
    }

    const adminId = (decoded as any).id;

    // Check if already a member
    const admin = await OrganizationAdmin.findById(adminId).lean();
    if (!admin) return NextResponse.json({ error: 'Admin not found' }, { status: 404 });

    const alreadyMember = ((admin as any).organizationId || []).some(
      (id: any) => id.toString() === org._id.toString()
    );
    if (alreadyMember) {
      return NextResponse.json({ error: 'You are already a member of this organization' }, { status: 400 });
    }

    // Check for existing pending request
    const existing = await JoinRequest.findOne({
      adminId,
      organizationId: org._id,
      status: 'pending',
    });
    if (existing) {
      return NextResponse.json(
        { error: 'You already have a pending request for this organization' },
        { status: 400 }
      );
    }

    const joinRequest = await JoinRequest.create({
      adminId,
      adminName: (admin as any).name,
      adminEmail: (admin as any).email,
      organizationId: org._id,
      organizationName: org.name,
    });

    return NextResponse.json({
      success: true,
      message: `Join request sent to ${org.name}. You will be notified once approved.`,
      data: { organizationName: org.name, requestId: joinRequest._id },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Join request error:', error);
    return NextResponse.json(
      { error: 'Failed to send join request', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

// GET — org owner fetches pending join requests for their org
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || (decoded as any).role !== 'organization') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await connectDB();

    const requests = await JoinRequest.find({
      organizationId: (decoded as any).id,
      status: 'pending',
    }).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ success: true, data: requests });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch join requests', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
