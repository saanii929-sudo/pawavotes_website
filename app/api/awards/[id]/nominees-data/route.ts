import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Award from '@/models/Award';
import Category from '@/models/Category';
import Nominee from '@/models/Nominee';
import { verifyToken } from '@/lib/auth';
import { sanitizeSearch } from '@/lib/security';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { id: awardId } = await params;

    // For org-admin, check assigned awards without DB call
    if (decoded.role === 'org-admin') {
      if (!decoded.assignedAwards?.includes(awardId)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    } else if (decoded.role !== 'organization') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await connectDB();

    // Parse optional filters
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');
    const status = searchParams.get('status');
    const search = sanitizeSearch(searchParams.get('search'));

    const nomineeQuery: any = { awardId };
    if (categoryId) nomineeQuery.categoryId = categoryId;
    if (status) nomineeQuery.nominationStatus = status.toLowerCase();
    if (search) nomineeQuery.name = { $regex: search, $options: 'i' };

    // For organization role, verify ownership AND fetch data in one parallel batch.
    // This eliminates the separate access-check round trip.
    const t0 = Date.now();
    const [award, categories, nominees] = await Promise.all([
      // Only needed for org role access check; org-admin already checked above
      decoded.role === 'organization'
        ? Award.findOne({ _id: awardId, organizationId: decoded.id }).select('_id').lean()
        : Promise.resolve({ _id: awardId }), // skip query for org-admin
      Category.find({ awardId })
        .select('name order')
        .sort({ order: 1, createdAt: -1 })
        .lean(),
      Nominee.find(nomineeQuery)
        .select('name nomineeCode categoryId image bio email phone status nominationStatus nominationType voteCount createdAt')
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    // Check access for organization role
    if (decoded.role === 'organization' && !award) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const queryTime = Date.now() - t0;

    // Build category map from the already-fetched categories
    const categoryMap = new Map(categories.map((c: any) => [c._id.toString(), c.name]));

    // Attach category names to nominees
    const nomineesWithCategory = nominees.map((n: any) => ({
      ...n,
      categoryId: {
        _id: n.categoryId?.toString() || '',
        name: categoryMap.get(n.categoryId?.toString()) || 'Unknown',
      },
    }));

    return NextResponse.json({
      success: true,
      categories,
      nominees: nomineesWithCategory,
      _debug: { queryTime, nomineeCount: nominees.length, categoryCount: categories.length },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch data', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
