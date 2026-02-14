import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Voter from '@/models/Voter';
import { verifyToken } from '@/lib/auth';

// PUT update voter
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
    const { name, email, phone, voterId, metadata, status } = body;

    // Verify voter belongs to organization
    const voter = await Voter.findOne({
      _id: id,
      organizationId: decoded.id,
    });

    if (!voter) {
      return NextResponse.json(
        { error: 'Voter not found' },
        { status: 404 }
      );
    }

    // Update voter
    const updateData: any = {};
    if (name) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (voterId !== undefined) updateData.voterId = voterId;
    if (metadata) updateData.metadata = metadata;
    if (status) updateData.status = status;

    const updatedVoter = await Voter.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Voter updated successfully',
      data: updatedVoter,
    });
  } catch (error: any) {
    console.error('Update voter error:', error);
    return NextResponse.json(
      { error: 'Failed to update voter', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE voter
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

    // Verify voter belongs to organization
    const voter = await Voter.findOneAndDelete({
      _id: id,
      organizationId: decoded.id,
    });

    if (!voter) {
      return NextResponse.json(
        { error: 'Voter not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Voter deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete voter error:', error);
    return NextResponse.json(
      { error: 'Failed to delete voter', details: error.message },
      { status: 500 }
    );
  }
}
