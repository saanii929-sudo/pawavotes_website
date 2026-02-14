import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Nominee from '@/models/Nominee';
import Category from '@/models/Category';
import { withAuth } from '@/middleware/auth';

async function getNominee(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const nominee = await Nominee.findById(id).populate('categoryId', 'name');

    if (!nominee) {
      return NextResponse.json(
        { error: 'Nominee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: nominee,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch nominee', details: error.message },
      { status: 500 }
    );
  }
}

async function updateNominee(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const body = await req.json();
    const { id } = await params;

    if (body.nominationStatus === 'accepted' && !body.status) {
      body.status = 'published';
    }

    if (body.nominationStatus === 'rejected' && !body.status) {
      body.status = 'cancelled';
    }

    const nominee = await Nominee.findByIdAndUpdate(
      id,
      body,
      { new: true, runValidators: true }
    );

    if (!nominee) {
      return NextResponse.json(
        { error: 'Nominee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Nominee updated successfully',
      data: nominee,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update nominee', details: error.message },
      { status: 500 }
    );
  }
}

async function deleteNominee(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const nominee = await Nominee.findByIdAndDelete(id);

    if (!nominee) {
      return NextResponse.json(
        { error: 'Nominee not found' },
        { status: 404 }
      );
    }

    await Category.findByIdAndUpdate(nominee.categoryId, {
      $inc: { nomineeCount: -1 },
    });

    return NextResponse.json({
      success: true,
      message: 'Nominee deleted successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to delete nominee', details: error.message },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getNominee);
export const PUT = withAuth(updateNominee);
export const DELETE = withAuth(deleteNominee);
