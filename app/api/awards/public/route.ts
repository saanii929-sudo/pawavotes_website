import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Award from '@/models/Award';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const awards = await Award.find({ status: 'published' })
      .select('name description votingStartDate votingEndDate status')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      awards,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch awards', details: error.message },
      { status: 500 }
    );
  }
}
