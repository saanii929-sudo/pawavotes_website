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
    const status = searchParams.get('status');
    const search = sanitizeSearch(searchParams.get('search'));
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '8')));
    const skip = (page - 1) * limit;

    const nomineeQuery: any = { awardId };
    if (categoryId) nomineeQuery.categoryId = categoryId;
    if (status) nomineeQuery.nominationStatus = status.toLowerCase();
    if (search) nomineeQuery.name = { $regex: search, $options: 'i' };

    const [award, categories, nominees, totalNominees] = await Promise.all([
      decoded.role === 'organization'
        ? Award.findOne({ _id: awardId, organizationId: decoded.id }).select('_id').lean()
        : Promise.resolve({ _id: awardId }),
      Category.find({ awardId })
        .select('name order')
        .sort({ order: 1, createdAt: -1 })
        .lean(),
      Nominee.find(nomineeQuery)
        .select('name nomineeCode categoryId image bio email phone status nominationStatus nominationType voteCount createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Nominee.countDocuments(nomineeQuery),
    ]);

    if (decoded.role === 'organization' && !award) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const categoryMap = new Map(categories.map((c: any) => [c._id.toString(), c.name]));

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
      pagination: {
        page,
        limit,
        total: totalNominees,
        pages: Math.ceil(totalNominees / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch data', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
