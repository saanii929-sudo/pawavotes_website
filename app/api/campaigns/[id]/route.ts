import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import NomineeCampaign from '@/models/NomineeCampaign';
import { verifyToken } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    
    let campaign;

    if (token) {
      const decoded = verifyToken(token);
      if (!decoded) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
      const organizationId = decoded.role === 'org-admin' ? decoded.organizationId : decoded.id;
      campaign = await NomineeCampaign.findOne({
        _id: id,
        organizationId: organizationId,
      })
        .populate('nomineeId', 'name image bio')
        .populate('categoryId', 'name')
        .populate('awardId', 'name organizationName pricing votingStartDate votingEndDate votingStartTime votingEndTime status settings')
        .lean();
    } else {
      campaign = await NomineeCampaign.findById(id)
        .populate('nomineeId', 'name image bio')
        .populate('categoryId', 'name')
        .populate('awardId', 'name organizationName pricing votingStartDate votingEndDate votingStartTime votingEndTime status settings')
        .lean();
    }

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
    return NextResponse.json(
      { error: 'Failed to fetch campaign', details: error.message },
      { status: 500 }
    );
  }
}
