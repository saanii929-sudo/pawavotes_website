import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Award from '@/models/Award';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    
    const award = await Award.findOne({
      _id: id,
      'settings.allowPublicVoting': true,
    }).select('name organizationName description banner logo nomination status settings');

    if (!award) {
      return NextResponse.json(
        { error: 'Award not found or not publicly accessible' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      award,
    });
  } catch (error: any) {
    console.error('Get public award error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch award', details: error.message },
      { status: 500 }
    );
  }
}
