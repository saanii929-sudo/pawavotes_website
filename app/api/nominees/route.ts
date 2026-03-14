import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Nominee from '@/models/Nominee';
import Category from '@/models/Category';
import Award from '@/models/Award';
import { withAuth } from '@/middleware/auth';
import { hasAwardAccess } from '@/lib/access-control';
import { sanitizeSearch } from '@/lib/security';

function generateAwardCode(name: string): string {
  const words = name.trim().split(/\s+/).filter(word => !/^\d+$/.test(word));
  const code = words
    .map(word => word.charAt(0).toUpperCase())
    .join('');
  
  return code;
}

async function generateNomineeCode(awardId: string): Promise<string> {
  const award = await Award.findById(awardId);
  if (!award) {
    throw new Error('Award not found');
  }

  if (!award.code) {
    const newCode = generateAwardCode(award.name);
    await Award.findByIdAndUpdate(awardId, { code: newCode }, { runValidators: false });
    award.code = newCode;
  }

  const nominees = await Nominee.find({
    awardId,
    nomineeCode: { $exists: true, $ne: null },
  }).select('nomineeCode');

  let maxNumber = 0;
  nominees.forEach(nominee => {
    if (nominee.nomineeCode) {
      const match = nominee.nomineeCode.match(/\d+$/);
      if (match) {
        const num = parseInt(match[0]);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    }
  });

  const nextNumber = maxNumber + 1;
  const formattedNumber = nextNumber.toString().padStart(3, '0');
  return `${award.code}${formattedNumber}`;
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

    const nominees = await Nominee.find(query)
      .populate('categoryId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: nominees,
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
