import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import NomineeCampaign from '@/models/NomineeCampaign';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const body = await req.json();
    const { action, platform } = body;

    const campaign = await NomineeCampaign.findById(id);

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }
    switch (action) {
      case 'view':
        campaign.analytics.views = (campaign.analytics.views || 0) + 1;
        break;
      case 'click':
        campaign.analytics.clicks = (campaign.analytics.clicks || 0) + 1;
        break;
      case 'share':
        campaign.analytics.shares = (campaign.analytics.shares || 0) + 1;
        break;
      case 'donation':
        campaign.analytics.donations = (campaign.analytics.donations || 0) + 1;
        break;
    }

    await campaign.save();

    return NextResponse.json({
      success: true,
      message: 'Analytics updated',
    });
  } catch (error: any) {
    console.error('Track campaign error:', error);
    return NextResponse.json(
      { error: 'Failed to track action', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
