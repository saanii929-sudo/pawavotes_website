import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Category from '@/models/Category';
import Award from '@/models/Award';
import { withAuth } from '@/middleware/auth';
import { hasAwardAccess } from '@/lib/access-control';

// GET single category
async function getCategory(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const user = (req as any).user;
    const { id } = await params;
    
    const category = await Category.findById(id);

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this category's award
    const hasAccess = await hasAwardAccess(
      user.id,
      user.role,
      category.awardId,
      user.assignedAwards
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: category,
    });
  } catch (error: any) {
    console.error('Get category error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category', details: error.message },
      { status: 500 }
    );
  }
}

// PUT update category
async function updateCategory(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const user = (req as any).user;
    const body = await req.json();
    const { id } = await params;

    // First, find the category to check access
    const existingCategory = await Category.findById(id);

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this category's award
    const hasAccess = await hasAwardAccess(
      user.id,
      user.role,
      existingCategory.awardId,
      user.assignedAwards
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Update the category
    const category = await Category.findByIdAndUpdate(
      id,
      body,
      { returnDocument: 'after', runValidators: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Category updated successfully',
      data: category,
    });
  } catch (error: any) {
    console.error('Update category error:', error);
    return NextResponse.json(
      { error: 'Failed to update category', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE category
async function deleteCategory(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const user = (req as any).user;
    const { id } = await params;
    
    // First, find the category to check access
    const category = await Category.findById(id);

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this category's award
    const hasAccess = await hasAwardAccess(
      user.id,
      user.role,
      category.awardId,
      user.assignedAwards
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Delete the category
    await Category.findByIdAndDelete(id);

    // Update award categories count
    await Award.findByIdAndUpdate(category.awardId, {
      $inc: { categories: -1 },
    });

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete category error:', error);
    return NextResponse.json(
      { error: 'Failed to delete category', details: error.message },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getCategory);
export const PUT = withAuth(updateCategory);
export const DELETE = withAuth(deleteCategory);
