import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Nominee from '@/models/Nominee';
import Category from '@/models/Category';
import Award from '@/models/Award';
import { withAuth } from '@/middleware/auth';

async function declineNominee(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();

    const { id } = await params;
    const nominee = await Nominee.findById(id);
    if (!nominee) {
      return NextResponse.json(
        { error: 'Nominee not found' },
        { status: 404 }
      );
    }
    if (nominee.nominationStatus === 'rejected') {
      return NextResponse.json(
        { error: 'Nominee is already declined' },
        { status: 400 }
      );
    }
    nominee.nominationStatus = 'rejected';
    nominee.status = 'rejected';
    await nominee.save();
    await Category.findByIdAndUpdate(nominee.categoryId, {
      $inc: { nomineeCount: -1 },
    });

    await Award.findByIdAndUpdate(nominee.awardId, {
      $inc: { totalNominees: -1 },
    });

    return NextResponse.json({
      success: true,
      message: 'Nominee declined successfully',
      data: nominee,
    });
  } catch (error: any) {
    console.error('Decline nominee error:', error);
    return NextResponse.json(
      { error: 'Failed to decline nominee', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

export const POST = withAuth(declineNominee);
