import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Award from '@/models/Award';
import { withAuth } from '@/middleware/auth';

async function updateAwardFee(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const body = await req.json();
    const { awardServiceFeePercentage } = body;

    // null means "use org default"
    if (awardServiceFeePercentage !== null) {
      const fee = Number(awardServiceFeePercentage);
      if (isNaN(fee) || fee < 0 || fee > 100) {
        return NextResponse.json(
          { error: 'Award service fee percentage must be between 0 and 100' },
          { status: 400 }
        );
      }
    }

    const award = await Award.findByIdAndUpdate(
      id,
      { awardServiceFeePercentage: awardServiceFeePercentage === null ? null : Number(awardServiceFeePercentage) },
      { new: true, runValidators: true }
    ).select('name code organizationName status awardServiceFeePercentage');

    if (!award) {
      return NextResponse.json({ error: 'Award not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Award fee updated successfully',
      data: award,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update award fee', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

export const PUT = withAuth(updateAwardFee, 'superadmin');
