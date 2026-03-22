import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import JoinRequest from '@/models/JoinRequest';
import OrganizationAdmin from '@/models/OrganizationAdmin';
import Organization from '@/models/Organization';
import { generateInvitationToken } from '@/lib/email';

// PATCH — org owner approves or rejects a join request
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || (decoded as any).role !== 'organization') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { action } = await req.json(); // 'approve' | 'reject'
    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Action must be approve or reject' }, { status: 400 });
    }

    await connectDB();

    const joinRequest = await JoinRequest.findOne({
      _id: id,
      organizationId: (decoded as any).id,
      status: 'pending',
    });
    if (!joinRequest) {
      return NextResponse.json({ error: 'Join request not found' }, { status: 404 });
    }

    if (action === 'reject') {
      await JoinRequest.findByIdAndUpdate(id, { status: 'rejected' });
      return NextResponse.json({ success: true, message: 'Join request rejected' });
    }

    // Approve: add this org to the admin's memberships as active
    const admin = await OrganizationAdmin.findById(joinRequest.adminId);
    if (!admin) {
      return NextResponse.json({ error: 'Admin account not found' }, { status: 404 });
    }

    const org = await Organization.findById((decoded as any).id);
    const organizationName = org?.name || 'Organization';

    // Check they're not already a member (race condition guard)
    const alreadyMember = (admin.organizationId || []).some(
      (oid: any) => oid.toString() === (decoded as any).id
    );
    if (!alreadyMember) {
      // Add org membership directly as active (they requested to join)
      await OrganizationAdmin.findByIdAndUpdate(admin._id, {
        $push: {
          organizationId: (decoded as any).id,
          organizations: {
            organizationId: (decoded as any).id,
            organizationName,
            assignedAwards: [],
            invitedBy: (decoded as any).id,
            status: 'active',
          },
        },
        // Ensure root status is active
        $set: { status: 'active' },
      });
    }

    await JoinRequest.findByIdAndUpdate(id, { status: 'approved' });

    return NextResponse.json({
      success: true,
      message: `${joinRequest.adminName} has been approved and added to your organization.`,
    });
  } catch (error: any) {
    console.error('Join request action error:', error);
    return NextResponse.json(
      { error: 'Failed to process join request', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
