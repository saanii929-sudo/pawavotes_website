import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import OrganizationAdmin from '@/models/OrganizationAdmin';
import { getOrgAdminEventIds } from '@/lib/org-admin-events';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

// Returns the current org-admin's assigned awards and events IDs for the sidebar
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);

    // Org owners always have full access
    if (decoded.role !== 'org-admin') {
      return NextResponse.json({
        success: true,
        data: { assignedAwards: [], assignedEvents: [], fullAccess: true },
      });
    }

    await connectDB();

    const admin = await OrganizationAdmin.findById(decoded.id).select('organizations').lean();
    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    const orgId = decoded.organizationId?.toString();
    const membership = (admin as any).organizations?.find(
      (o: any) => o.organizationId?.toString() === orgId
    );
    const assignedEvents = await getOrgAdminEventIds(String(decoded.id), orgId);

    return NextResponse.json({
      success: true,
      data: {
        assignedAwards: (membership?.assignedAwards || []).map((id: any) => id.toString()),
        assignedEvents,
        fullAccess: false,
      },
    });
  } catch (error: any) {
    console.error('my-assignments error:', error);
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
  }
}
