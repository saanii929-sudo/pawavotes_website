import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Election from '@/models/Election';
import { verifyToken } from '@/lib/auth';

// PUT update election
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
    const { title, description, startDate, endDate, settings, status } = body;

    // Verify election belongs to organization
    const election = await Election.findOne({
      _id: id,
      organizationId: decoded.id,
    });

    if (!election) {
      return NextResponse.json(
        { error: 'Election not found' },
        { status: 404 }
      );
    }

    // Validate dates if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start >= end) {
        return NextResponse.json(
          { error: 'End date must be after start date' },
          { status: 400 }
        );
      }
    }

    // Update election
    const updateData: any = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);
    if (settings) updateData.settings = settings;
    if (status) updateData.status = status;

    const updatedElection = await Election.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Election updated successfully',
      data: updatedElection,
    });
  } catch (error: any) {
    console.error('Update election error:', error);
    return NextResponse.json(
      { error: 'Failed to update election', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE election
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

    // Verify election belongs to organization
    const election = await Election.findOneAndDelete({
      _id: id,
      organizationId: decoded.id,
    });

    if (!election) {
      return NextResponse.json(
        { error: 'Election not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Election deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete election error:', error);
    return NextResponse.json(
      { error: 'Failed to delete election', details: error.message },
      { status: 500 }
    );
  }
}
