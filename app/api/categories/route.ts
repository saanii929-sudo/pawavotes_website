import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Category from '@/models/Category';
import Award from '@/models/Award';
import { withAuth } from '@/middleware/auth';
import { hasAwardAccess } from '@/lib/access-control';

// GET all categories for the logged-in organization or org-admin
async function getCategories(req: NextRequest) {
  try {
    await connectDB();

    const user = (req as any).user;
    const { searchParams } = new URL(req.url);
    const awardId = searchParams.get('awardId');
    const search = searchParams.get('search') || '';

    let query: any = {};

    // If awardId is provided, check access
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
      // If no awardId, filter by organization or assigned awards
      if (user.role === 'org-admin') {
        if (!user.assignedAwards || user.assignedAwards.length === 0) {
          return NextResponse.json({
            success: true,
            data: [],
          });
        }
        query.awardId = { $in: user.assignedAwards };
      } else {
        query.organizationId = user.id;
      }
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const categories = await Category.find(query).sort({ order: 1, createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: categories,
    });
  } catch (error: any) {
    console.error('Get categories error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories', details: error.message },
      { status: 500 }
    );
  }
}

// POST create new category
async function createCategory(req: NextRequest) {
  try {
    await connectDB();

    const user = (req as any).user;
    const body = await req.json();
    
    const { name, description, awardId, price, isPublished, order } = body;

    if (!name || !awardId) {
      return NextResponse.json(
        { error: 'Name and award ID are required' },
        { status: 400 }
      );
    }

    // Check if user has access to this award
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

    // Get the organizationId based on user role
    const organizationId = user.role === 'org-admin' ? user.organizationId : user.id;

    // Verify award belongs to organization
    const award = await Award.findOne({
      _id: awardId,
      organizationId: organizationId,
    });

    if (!award) {
      return NextResponse.json(
        { error: 'Award not found' },
        { status: 404 }
      );
    }

    const category = await Category.create({
      name,
      description,
      awardId,
      awardName: award.name,
      organizationId: organizationId,
      price: price || 0,
      isPublished: isPublished || false,
      order: order || 0,
    });

    // Update award categories count
    await Award.findByIdAndUpdate(awardId, {
      $inc: { categories: 1 },
    });

    return NextResponse.json({
      success: true,
      message: 'Category created successfully',
      data: category,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Create category error:', error);
    return NextResponse.json(
      { error: 'Failed to create category', details: error.message },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getCategories);
export const POST = withAuth(createCategory);
