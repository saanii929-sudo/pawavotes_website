import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import NomineeCampaign from '@/models/NomineeCampaign';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    const campaign = await NomineeCampaign.findById(id)
      .populate('nomineeId', 'name image bio')
      .populate('categoryId', 'name')
      .populate('awardId', 'name organizationName pricing')
      .lean();

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      campaign,
    });
  } catch (error: any) {
    console.error('Get campaign error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign', details: error.message },
      { status: 500 }
    );
  }
}
