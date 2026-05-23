import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Award from '@/models/Award';
import Category from '@/models/Category';
import Nominee from '@/models/Nominee';
import { verifyToken } from '@/lib/auth';

connectDB().catch(() => {});

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

    if (decoded.role === 'org-admin') {
      if (!decoded.assignedAwards?.includes(awardId)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    } else if (decoded.role !== 'organization') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');

    const nomineeQuery: any = { awardId };
    if (categoryId && categoryId !== 'all') nomineeQuery.categoryId = categoryId;

    const [award, categories, nominees] = await Promise.all([
      decoded.role === 'organization'
        ? Award.findOne({ _id: awardId, organizationId: decoded.id })
            .select('name banner')
            .lean()
        : Award.findById(awardId).select('name banner').lean(),
      Category.find({ awardId })
        .select('name order')
        .sort({ order: 1, createdAt: 1 })
        .lean(),
      Nominee.find(nomineeQuery)
        .select('name nomineeCode categoryId image voteCount')
        .sort({ voteCount: -1 })
        .lean(),
    ]);

    if (decoded.role === 'organization' && !award) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const categoryOrderMap = new Map(
      (categories as any[]).map((c: any, i: number) => [
        c._id.toString(),
        c.order ?? i,
      ])
    );
    const categoryNameMap = new Map(
      (categories as any[]).map((c: any) => [c._id.toString(), c.name])
    );

    // Group nominees by category, sorted by vote count descending
    const grouped: Record<
      string,
      { categoryName: string; order: number; nominees: any[] }
    > = {};

    for (const nominee of nominees as any[]) {
      const catId = nominee.categoryId?.toString() || 'unknown';
      if (!grouped[catId]) {
        grouped[catId] = {
          categoryName: categoryNameMap.get(catId) || 'Unknown Category',
          order: categoryOrderMap.get(catId) ?? 999,
          nominees: [],
        };
      }
      grouped[catId].nominees.push({
        _id: nominee._id.toString(),
        name: nominee.name,
        nomineeCode: nominee.nomineeCode || null,
        image: nominee.image || null,
        voteCount: nominee.voteCount || 0,
      });
    }

    const sortedCategories = Object.values(grouped).sort(
      (a, b) => a.order - b.order
    );

    return NextResponse.json({
      success: true,
      award: {
        name: (award as any)?.name || 'Award',
        banner: (award as any)?.banner || null,
      },
      categories: sortedCategories,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Failed to fetch print data',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
