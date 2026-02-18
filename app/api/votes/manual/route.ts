import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { voteService } from '@/services/vote.service';
import Vote from '@/models/Vote';
import Nominee from '@/models/Nominee';
import Category from '@/models/Category';
import Award from '@/models/Award';
import { verifyToken } from '@/lib/auth';
import { hasAwardAccess } from '@/lib/access-control';

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

    const body = await req.json();
    const { awardId, categoryId, nomineeId, numberOfVotes, stageId } = body;

    if (!awardId || !categoryId || !nomineeId || !numberOfVotes) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (numberOfVotes <= 0) {
      return NextResponse.json(
        { error: 'Number of votes must be greater than 0' },
        { status: 400 }
      );
    }

    // Check if user has access to this award
    let assignedAwards: string[] = [];
    if (decoded.role === 'org-admin') {
      const OrganizationAdmin = (await import('@/models/OrganizationAdmin')).default;
      const admin = await OrganizationAdmin.findById(decoded.id);
      assignedAwards = admin?.assignedAwards?.map((id: any) => id.toString()) || [];
    }

    const hasAccess = await hasAwardAccess(decoded.id, decoded.role, awardId, assignedAwards);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Verify nominee exists and belongs to the category
    const nominee = await Nominee.findOne({
      _id: nomineeId,
      categoryId,
      awardId,
    });

    if (!nominee) {
      return NextResponse.json(
        { error: 'Nominee not found or does not belong to the selected category' },
        { status: 404 }
      );
    }

    // Generate reference ID
    const referenceId = `MANUAL_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Create vote with stage validation using VoteService
    const vote = await voteService.createVote({
      awardId,
      categoryId,
      nomineeId,
      stageId, // Will be auto-assigned if not provided
      voterEmail: decoded.email || 'manual@system.local',
      voterPhone: 'N/A',
      numberOfVotes,
      voteCount: numberOfVotes,
      paymentReference: referenceId,
      transactionReference: referenceId,
      paymentMethod: 'manual',
      paymentStatus: 'completed',
    });

    // Update nominee vote count
    await Nominee.findByIdAndUpdate(
      nomineeId,
      { $inc: { voteCount: numberOfVotes } }
    );

    // Update category vote count
    await Category.findByIdAndUpdate(
      categoryId,
      { $inc: { voteCount: numberOfVotes } }
    );

    // Update award vote count
    await Award.findByIdAndUpdate(
      awardId,
      { $inc: { totalVotes: numberOfVotes } }
    );

    console.log(`Manual votes added: ${numberOfVotes} votes for nominee ${nomineeId}${vote.stageId ? ` in stage ${vote.stageId}` : ''}`);

    // Get stage name if vote has stageId
    let stageName = null;
    if (vote.stageId) {
      const Stage = (await import('@/models/Stage')).default;
      const stage = await Stage.findById(vote.stageId).select('name');
      stageName = stage?.name;
    }

    return NextResponse.json({
      success: true,
      message: 'Votes added successfully',
      data: {
        ...vote.toObject(),
        stageName,
      },
    });
  } catch (error: any) {
    console.error('Add manual votes error:', error);
    return NextResponse.json(
      { error: 'Failed to add votes', details: error.message },
      { status: error.statusCode || 500 }
    );
  }
}
