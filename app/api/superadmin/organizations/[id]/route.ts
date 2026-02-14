import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Organization from '@/models/Organization';
import { hashPassword } from '@/lib/auth';
import { withAuth } from '@/middleware/auth';

// GET single organization
async function getOrganization(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const organization = await Organization.findById(params.id).select('-password');

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: organization,
    });
  } catch (error: any) {
    console.error('Get organization error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization', details: error.message },
      { status: 500 }
    );
  }
}

// PUT update organization
async function updateOrganization(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const body = await req.json();
    const { password, ...updateData } = body;

    if (password) {
      updateData.password = await hashPassword(password);
    }

    const organization = await Organization.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Organization updated successfully',
      data: organization,
    });
  } catch (error: any) {
    console.error('Update organization error:', error);
    return NextResponse.json(
      { error: 'Failed to update organization', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE organization
async function deleteOrganization(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const organization = await Organization.findByIdAndDelete(params.id);

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Organization deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete organization error:', error);
    return NextResponse.json(
      { error: 'Failed to delete organization', details: error.message },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getOrganization, 'superadmin');
export const PUT = withAuth(updateOrganization, 'superadmin');
export const DELETE = withAuth(deleteOrganization, 'superadmin');
