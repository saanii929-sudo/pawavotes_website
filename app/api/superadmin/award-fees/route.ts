import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Award from '@/models/Award';
import Organization from '@/models/Organization';
import { withAuth } from '@/middleware/auth';

async function getAwardFees(req: NextRequest) {
  try {
    await connectDB();

    const awards = await Award.find({})
      .select('name code organizationId organizationName status awardServiceFeePercentage')
      .sort({ createdAt: -1 })
      .lean();

    // Fetch org service fee percentages for context
    const orgIds = [...new Set(awards.map((a) => a.organizationId))];
    const orgs = await Organization.find({ _id: { $in: orgIds } })
      .select('_id serviceFeePercentage')
      .lean();

    const orgFeeMap: Record<string, number> = {};
    for (const org of orgs) {
      orgFeeMap[String(org._id)] = (org as any).serviceFeePercentage ?? 10;
    }

    const data = awards.map((a) => ({
      _id: a._id,
      name: a.name,
      code: a.code,
      organizationId: a.organizationId,
      organizationName: a.organizationName,
      status: a.status,
      awardServiceFeePercentage: (a as any).awardServiceFeePercentage ?? null,
      orgServiceFeePercentage: orgFeeMap[a.organizationId] ?? 10,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch award fees', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getAwardFees, 'superadmin');
