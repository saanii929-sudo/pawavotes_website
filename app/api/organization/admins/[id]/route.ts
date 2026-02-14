import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import OrganizationAdmin from '@/models/OrganizationAdmin';
import Award from '@/models/Award';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// GET single admin
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== 'organization') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    await connectDB();

    const admin = await OrganizationAdmin.findOne({
      _id: id,
      organizationId: decoded.id,
    })
      .populate('assignedAwards', 'name')
      .select('-password');

    if (!admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: admin,
    });
  } catch (error: any) {
    console.error('Get admin error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin', details: error.message },
      { status: 500 }
    );
  }
}

// PUT update admin
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== 'organization') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await req.json();
    const { name, assignedAwards, status } = body;

    // Verify admin belongs to this organization
    const admin = await OrganizationAdmin.findOne({
      _id: id,
      organizationId: decoded.id,
    });

    if (!admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Verify assigned awards belong to this organization
    if (assignedAwards && assignedAwards.length > 0) {
      const awards = await Award.find({
        _id: { $in: assignedAwards },
        organizationId: decoded.id,
      });

      if (awards.length !== assignedAwards.length) {
        return NextResponse.json(
          { error: 'Some awards do not belong to your organization' },
          { status: 400 }
        );
      }
    }

    // Update admin
    const updateData: any = {};
    if (name) updateData.name = name;
    if (assignedAwards !== undefined) updateData.assignedAwards = assignedAwards;
    if (status) updateData.status = status;

    const updatedAdmin = await OrganizationAdmin.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('assignedAwards', 'name')
      .select('-password');

    return NextResponse.json({
      success: true,
      message: 'Admin updated successfully',
      data: updatedAdmin,
    });
  } catch (error: any) {
    console.error('Update admin error:', error);
    return NextResponse.json(
      { error: 'Failed to update admin', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE admin
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== 'organization') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    await connectDB();

    const admin = await OrganizationAdmin.findOneAndDelete({
      _id: id,
      organizationId: decoded.id,
    });

    if (!admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Admin deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete admin error:', error);
    return NextResponse.json(
      { error: 'Failed to delete admin', details: error.message },
      { status: 500 }
    );
  }
}
