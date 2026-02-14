import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import NomineeCampaign from '@/models/NomineeCampaign';
import Nominee from '@/models/Nominee';
import { verifyToken } from '@/lib/auth';

// Create campaign
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    console.log('Creating campaign - User:', {
      id: decoded.id,
      role: decoded.role,
      organizationId: decoded.organizationId,
    });

    const body = await req.json();
    const {
      nomineeId,
      campaignName,
      description,
      goalAmount,
      socialMedia,
    } = body;

    // Get nominee details
    const nominee = await Nominee.findById(nomineeId).populate('awardId categoryId');
    if (!nominee) {
      return NextResponse.json({ error: 'Nominee not found' }, { status: 404 });
    }

    // Check if campaign already exists
    const existingCampaign = await NomineeCampaign.findOne({ nomineeId });
    if (existingCampaign) {
      return NextResponse.json(
        { error: 'Campaign already exists for this nominee' },
        { status: 400 }
      );
    }

    // Get the organizationId based on user role
    const organizationId = decoded.role === 'org-admin' ? decoded.organizationId : decoded.id;

    console.log('Creating campaign with organizationId:', organizationId);

    // Create campaign
    const campaign = await NomineeCampaign.create({
      nomineeId,
      awardId: (nominee as any).awardId._id,
      categoryId: (nominee as any).categoryId._id,
      organizationId: organizationId,
      campaignName,
      description,
      goalAmount,
      socialMedia: socialMedia || {},
      currentAmount: 0,
      supporters: [],
      status: 'active',
    });

    console.log('Campaign created successfully:', campaign._id);

    return NextResponse.json({
      success: true,
      campaign,
    });
  } catch (error: any) {
    console.error('Create campaign error:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign', details: error.message },
      { status: 500 }
    );
  }
}

// Get campaigns
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const nomineeId = searchParams.get('nomineeId');
    const awardId = searchParams.get('awardId');

    // Get the organizationId based on user role
    const organizationId = decoded.role === 'org-admin' ? decoded.organizationId : decoded.id;

    let query: any = {
      organizationId: organizationId, // Filter by organization
    };

    if (nomineeId) {
      query.nomineeId = nomineeId;
    }

    if (awardId) {
      query.awardId = awardId;
    }

    const campaigns = await NomineeCampaign.find(query)
      .populate('nomineeId', 'name image')
      .populate('categoryId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      campaigns,
    });
  } catch (error: any) {
    console.error('Get campaigns error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns', details: error.message },
      { status: 500 }
    );
  }
}
