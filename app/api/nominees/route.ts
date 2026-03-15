import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Nominee from '@/models/Nominee';
import Category from '@/models/Category';
import Award from '@/models/Award';
import { withAuth } from '@/middleware/auth';
import { hasAwardAccess } from '@/lib/access-control';
import { sanitizeSearch } from '@/lib/security';

// Initiate DB connection at module load so it's warm before the first request
connectDB().catch(() => {});

function generateAwardCode(name: string): string {
  const words = name.trim().split(/\s+/).filter(word => !/^\d+$/.test(word));
  const code = words
    .map(word => word.charAt(0).toUpperCase())
    .join('');
  
  return code;
}

async function generateNomineeCode(awardId: string): Promise<string> {
  const award = await Award.findById(awardId).select('code name').lean() as any;
  if (!award) {
    throw new Error('Award not found');
  }

  let awardCode = award.code;
  if (!awardCode) {
    awardCode = generateAwardCode(award.name);
    await Award.findByIdAndUpdate(awardId, { code: awardCode }, { runValidators: false });
  }

  // Use aggregation to find the max numeric suffix in one query instead of fetching all nominees
  const result = await Nominee.aggregate([
    { $match: { awardId: award._id, nomineeCode: { $exists: true, $ne: null } } },
    { $project: { num: { $toInt: { $substr: ['$nomineeCode', awardCode.length, -1] } } } },
    { $group: { _id: null, maxNum: { $max: '$num' } } },
  ]);

  const maxNumber = result[0]?.maxNum ?? 0;
  const formattedNumber = (maxNumber + 1).toString().padStart(3, '0');
  return `${awardCode}${formattedNumber}`;
}

async function getNominees(req: NextRequest) {
  try {
    await connectDB();

    const user = (req as any).user;
    const { searchParams } = new URL(req.url);
    const awardId = searchParams.get('awardId');
    const categoryId = searchParams.get('categoryId');
    const status = searchParams.get('status');
    const search = sanitizeSearch(searchParams.get('search'));

    const query: any = {};

    if (awardId) {
      // For organization role, filter by organizationId directly instead of
      // doing a separate Award.findOne lookup — saves a DB round trip
      if (user.role === 'organization') {
        const awardExists = await Award.exists({ _id: awardId, organizationId: user.id });
        if (!awardExists) {
          return NextResponse.json(
            { error: 'You do not have access to this award' },
            { status: 403 }
          );
        }
      } else {
        const hasAccess = await hasAwardAccess(
          user.id,
          user.role,
          awardId,
          user.assignedAwards
        );
        if (!hasAccess) {
          return NextResponse.json(
            { error: 'You do not have access to this award' },
            { status: 403 }
          );
        }
      }

      query.awardId = awardId;
    } else {
      if (user.role === 'org-admin') {
        if (!user.assignedAwards || user.assignedAwards.length === 0) {
          return NextResponse.json({
            success: true,
            data: [],
          });
        }
        query.awardId = { $in: user.assignedAwards };
      }
    }

    if (categoryId) {
      query.categoryId = categoryId;
    }

    if (status) {
      query.nominationStatus = status.toLowerCase();
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    // Run nominee query and category batch-fetch in parallel
    const nomineesPromise = Nominee.find(query)
      .select('name nomineeCode awardId categoryId image bio email phone status nominationStatus nominationType voteCount createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const nominees = await nomineesPromise;

    // Batch-fetch category names instead of N+1 populate
    const categoryIds = [...new Set(nominees.map((n: any) => n.categoryId?.toString()).filter(Boolean))];
    let categoryMap = new Map<string, string>();
    if (categoryIds.length > 0) {
      const cats = await Category.find({ _id: { $in: categoryIds } }).select('name').lean();
      categoryMap = new Map(cats.map((c: any) => [c._id.toString(), c.name]));
    }

    // Attach category info in the same shape the frontend expects
    const data = nominees.map((n: any) => ({
      ...n,
      categoryId: {
        _id: n.categoryId?.toString() || '',
        name: categoryMap.get(n.categoryId?.toString()) || 'Unknown',
      },
    }));

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch nominees', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

async function createNominee(req: NextRequest) {
  try {
    await connectDB();

    const user = (req as any).user;
    const body = await req.json();
    
    const { name, awardId, categoryId, image, bio, email, phone, status } = body;

    if (!name || !awardId || !categoryId) {
      return NextResponse.json(
        { error: 'Name, award ID, and category ID are required' },
        { status: 400 }
      );
    }
    const category = await Category.findById(categoryId);
    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    const nomineeCode = await generateNomineeCode(awardId);

    const nominee = await Nominee.create({
      name,
      nomineeCode,
      awardId,
      categoryId,
      image: image || undefined,
      bio: bio || undefined,
      email: email || undefined,
      phone: phone || undefined,
      status: status || 'draft',
      nominationStatus: 'accepted',
      nominationType: 'organizer',
    });

    await Category.findByIdAndUpdate(categoryId, {
      $inc: { nomineeCount: 1 },
    });

    return NextResponse.json({
      success: true,
      message: 'Nominee created successfully',
      data: nominee,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to create nominee', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getNominees);
export const POST = withAuth(createNominee);
