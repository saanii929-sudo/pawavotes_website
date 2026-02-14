import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Award from '@/models/Award';
import { withAuth } from '@/middleware/auth';

// GET single award
async function getAward(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const user = (req as any).user;
    const { id } = await params;
    
    let query: any = { _id: id };
    
    // If org-admin, check if they have access to this award
    if (user.role === 'org-admin') {
      if (!user.assignedAwards || !user.assignedAwards.includes(id)) {
        return NextResponse.json(
          { error: 'You do not have access to this award' },
          { status: 403 }
        );
      }
    } else {
      // Organization owner can only see their own awards
      query.organizationId = user.id;
    }
    
    const award = await Award.findOne(query);

    if (!award) {
      return NextResponse.json(
        { error: 'Award not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: award,
    });
  } catch (error: any) {
    console.error('Get award error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch award', details: error.message },
      { status: 500 }
    );
  }
}

// PUT update award
async function updateAward(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const user = (req as any).user;
    const body = await req.json();
    const { id } = await params;

    let query: any = { _id: id };
    
    // If org-admin, check if they have access to this award
    if (user.role === 'org-admin') {
      if (!user.assignedAwards || !user.assignedAwards.includes(id)) {
        return NextResponse.json(
          { error: 'You do not have access to this award' },
          { status: 403 }
        );
      }
    } else {
      // Organization owner can only update their own awards
      query.organizationId = user.id;
    }

    const award = await Award.findOneAndUpdate(
      query,
      body,
      { new: true, runValidators: true }
    );

    if (!award) {
      return NextResponse.json(
        { error: 'Award not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Award updated successfully',
      data: award,
    });
  } catch (error: any) {
    console.error('Update award error:', error);
    return NextResponse.json(
      { error: 'Failed to update award', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE award
async function deleteAward(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const user = (req as any).user;
    const { id } = await params;
    
    // Only organization owners can delete awards
    if (user.role === 'org-admin') {
      return NextResponse.json(
        { error: 'Only organization owners can delete awards' },
        { status: 403 }
      );
    }
    
    const award = await Award.findOneAndDelete({
      _id: id,
      organizationId: user.id,
    });

    if (!award) {
      return NextResponse.json(
        { error: 'Award not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Award deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete award error:', error);
    return NextResponse.json(
      { error: 'Failed to delete award', details: error.message },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getAward);
export const PUT = withAuth(updateAward);
export const DELETE = withAuth(deleteAward);
