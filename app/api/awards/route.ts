import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Award from '@/models/Award';
import { withAuth } from '@/middleware/auth';

// Generate award code from name (e.g., "Ghana Music Awards" -> "GMA")
// Numbers in the name are excluded (e.g., "Ghana Music Awards 2024" -> "GMA")
function generateAwardCode(name: string): string {
  // Split by spaces and filter out words that are purely numeric
  const words = name.trim().split(/\s+/).filter(word => !/^\d+$/.test(word));
  const code = words
    .map(word => word.charAt(0).toUpperCase())
    .join('');
  
  return code;
}

// Ensure unique code by adding number suffix if needed
async function generateUniqueCode(baseName: string): Promise<string> {
  let code = generateAwardCode(baseName);
  let counter = 1;
  let isUnique = false;

  while (!isUnique) {
    const existing = await Award.findOne({ code });
    if (!existing) {
      isUnique = true;
    } else {
      // Add number suffix (GMA -> GMA2, GMA3, etc.)
      code = `${generateAwardCode(baseName)}${counter}`;
      counter++;
    }
  }

  return code;
}

// GET all awards for the logged-in organization or org-admin
async function getAwards(req: NextRequest) {
  try {
    await connectDB();

    const user = (req as any).user;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    let query: any = {};

    // If org-admin, filter by assigned awards
    if (user.role === 'org-admin') {
      if (!user.assignedAwards || user.assignedAwards.length === 0) {
        // No awards assigned, return empty
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
      // Organization owner sees all their awards
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
        .limit(limit),
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
    console.error('Get awards error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch awards', details: error.message },
      { status: 500 }
    );
  }
}

// POST create new award
async function createAward(req: NextRequest) {
  try {
    await connectDB();

    const user = (req as any).user;
    
    // Only organization owners can create awards, not org-admins
    if (user.role === 'org-admin') {
      return NextResponse.json(
        { error: 'Only organization owners can create awards' },
        { status: 403 }
      );
    }

    const body = await req.json();
    
    console.log('Received award data:', body);
    console.log('User from token:', user);
    
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

    // Validate dates
    if (new Date(startDate) > new Date(endDate)) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    // Generate unique award code
    const code = await generateUniqueCode(name);

    // Get organization name from request body or from user token
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
    console.error('Create award error:', error);
    return NextResponse.json(
      { error: 'Failed to create award', details: error.message },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getAwards);
export const POST = withAuth(createAward);
