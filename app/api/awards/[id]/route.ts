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

// Generate award code from name (e.g., "Ghana Music Awards" -> "GMA")
function generateAwardCode(name: string): string {
  // Split by spaces and get first letter of each word
  const words = name.trim().split(/\s+/);
  const code = words
    .map(word => word.charAt(0).toUpperCase())
    .join('');
  
  return code;
}

// Ensure unique code by adding number suffix if needed
async function generateUniqueCode(baseName: string, excludeId?: string): Promise<string> {
  let code = generateAwardCode(baseName);
  let counter = 1;
  let isUnique = false;

  while (!isUnique) {
    const query: any = { code };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const existing = await Award.findOne(query);
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

    // Check if the award exists first
    const existingAward = await Award.findOne(query);
    
    if (!existingAward) {
      return NextResponse.json(
        { error: 'Award not found' },
        { status: 404 }
      );
    }

    // If name is being updated, regenerate the code
    if (body.name && body.name !== existingAward.name) {
      body.code = await generateUniqueCode(body.name, id);
    }

    const award = await Award.findOneAndUpdate(
      query,
      body,
      { new: true, runValidators: true }
    );

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
