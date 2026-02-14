import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ElectionCategory from '@/models/ElectionCategory';
import { verifyToken } from '@/lib/auth';

// PUT update category
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'organization') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, description, maxSelections, order } = body;

    // Verify category belongs to organization
    const category = await ElectionCategory.findOne({
      _id: id,
      organizationId: decoded.id,
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Update category
    const updateData: any = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (maxSelections) updateData.maxSelections = maxSelections;
    if (order !== undefined) updateData.order = order;

    const updatedCategory = await ElectionCategory.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Position updated successfully',
      data: updatedCategory,
    });
  } catch (error: any) {
    console.error('Update category error:', error);
    return NextResponse.json(
      { error: 'Failed to update position', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE category
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'organization') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify category belongs to organization
    const category = await ElectionCategory.findOneAndDelete({
      _id: id,
      organizationId: decoded.id,
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Position deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete category error:', error);
    return NextResponse.json(
      { error: 'Failed to delete position', details: error.message },
      { status: 500 }
    );
  }
}
