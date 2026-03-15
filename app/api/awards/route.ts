import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Award from '@/models/Award';
import { withAuth } from '@/middleware/auth';
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

async function generateUniqueCode(baseName: string): Promise<string> {
  let code = generateAwardCode(baseName);
  let counter = 1;
  let isUnique = false;

  while (!isUnique) {
    const existing = await Award.findOne({ code });
    if (!existing) {
      isUnique = true;
    } else {
      code = `${generateAwardCode(baseName)}${counter}`;
      counter++;
    }
  }

  return code;
}

async function getAwards(req: NextRequest) {
  try {
    await connectDB();

    const user = (req as any).user;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = sanitizeSearch(searchParams.get('search'));
    const status = searchParams.get('status') || '';

    let query: any = {};

    if (user.role === 'org-admin') {
      if (!user.assignedAwards || user.assignedAwards.length === 0) {
        return NextResponse.json({
          success: true,
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            pages: 0,
          },
        });
      }
      query._id = { $in: user.assignedAwards };
    } else {
      query.organizationId = user.id;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [awards, total] = await Promise.all([
      Award.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Award.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: awards,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch awards', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

async function createAward(req: NextRequest) {
  try {
    await connectDB();

    const user = (req as any).user;
    
    if (user.role === 'org-admin') {
      return NextResponse.json(
        { error: 'Only organization owners can create awards' },
        { status: 403 }
      );
    }

    const body = await req.json();
    
    const {
      name,
      organizationName,
      description,
      startDate,
      endDate,
      votingStartDate,
      votingEndDate,
      votingStartTime,
      votingEndTime,
      status,
      banner,
      nomination,
      pricing,
      settings,
    } = body;

    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Name, start date, and end date are required' },
        { status: 400 }
      );
    }

    if (new Date(startDate) > new Date(endDate)) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }
    const code = await generateUniqueCode(name);
    const orgName = organizationName || user.organizationName || user.name;
    
    if (!orgName) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      );
    }

    const award = await Award.create({
      name,
      code,
      description,
      organizationId: user.id,
      organizationName: orgName,
      startDate,
      endDate,
      votingStartDate,
      votingEndDate,
      votingStartTime,
      votingEndTime,
      status: status || 'draft',
      banner,
      nomination,
      pricing,
      createdBy: user.id,
      settings: settings || {},
    });

    return NextResponse.json({
      success: true,
      message: 'Award created successfully',
      data: award,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to create award', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getAwards);
export const POST = withAuth(createAward);
