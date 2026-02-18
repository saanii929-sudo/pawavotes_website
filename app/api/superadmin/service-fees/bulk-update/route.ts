import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Organization from '@/models/Organization';
import { withAuth } from '@/middleware/auth';

// PUT bulk update service fees for all organizations
async function bulkUpdateServiceFees(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { serviceFeePercentage } = body;

    // Validate service fee percentage
    if (
      serviceFeePercentage === undefined ||
      serviceFeePercentage === null ||
      isNaN(serviceFeePercentage) ||
      serviceFeePercentage < 0 ||
      serviceFeePercentage > 100
    ) {
      return NextResponse.json(
        { error: 'Service fee percentage must be between 0 and 100' },
        { status: 400 }
      );
    }

    // Update all organizations
    const result = await Organization.updateMany(
      {},
      { $set: { serviceFeePercentage: Number(serviceFeePercentage) } }
    );

    return NextResponse.json({
      success: true,
      message: `Updated service fee to ${serviceFeePercentage}% for all organizations`,
      count: result.modifiedCount,
    });
  } catch (error: any) {
    console.error('Bulk update service fees error:', error);
    return NextResponse.json(
      { error: 'Failed to update service fees', details: error.message },
      { status: 500 }
    );
  }
}

export const PUT = withAuth(bulkUpdateServiceFees, 'superadmin');
