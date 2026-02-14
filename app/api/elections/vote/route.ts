import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Voter from '@/models/Voter';
import Election from '@/models/Election';
import ElectionVote from '@/models/ElectionVote';
import Candidate from '@/models/Candidate';
import { verifyPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { token, votes } = body;

    if (!token || !votes || !Array.isArray(votes) || votes.length === 0) {
      return NextResponse.json(
        { error: 'Token and votes are required' },
        { status: 400 }
      );
    }

    // Find voter
    const voter = await Voter.findOne({ token: token.toUpperCase() });

    if (!voter) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if voter has already voted
    if (voter.hasVoted) {
      return NextResponse.json(
        { error: 'You have already voted' },
        { status: 403 }
      );
    }

    // Check if voter status is active
    if (voter.status !== 'active') {
      return NextResponse.json(
        { error: 'Your voting access has been disabled' },
        { status: 403 }
      );
    }

    // Get election
    const election = await Election.findById(voter.electionId);

    if (!election) {
      return NextResponse.json(
        { error: 'Election not found' },
        { status: 404 }
      );
    }

    // Check if election is active
    const now = new Date();
    const startDate = new Date(election.startDate);
    const endDate = new Date(election.endDate);

    if (now < startDate) {
      return NextResponse.json(
        { error: 'Voting has not started yet' },
        { status: 403 }
      );
    }

    if (now > endDate) {
      return NextResponse.json(
        { error: 'Voting has ended' },
        { status: 403 }
      );
    }

    // Validate and save votes
    const votesToSave = [];
    const candidateUpdates = [];

    for (const vote of votes) {
      const { categoryId, candidateId } = vote;

      if (!categoryId || !candidateId) {
        return NextResponse.json(
          { error: 'Invalid vote data' },
          { status: 400 }
        );
      }

      // Verify candidate exists and belongs to this election
      const candidate = await Candidate.findOne({
        _id: candidateId,
        categoryId,
        electionId: voter.electionId,
      });

      if (!candidate) {
        return NextResponse.json(
          { error: 'Invalid candidate selection' },
          { status: 400 }
        );
      }

      votesToSave.push({
        electionId: voter.electionId,
        voterId: voter._id,
        categoryId,
        candidateId,
        organizationId: voter.organizationId,
        voterToken: voter.token,
      });

      candidateUpdates.push(candidateId);
    }

    // Save all votes
    await ElectionVote.insertMany(votesToSave);

    // Update candidate vote counts
    await Promise.all(
      candidateUpdates.map(candidateId =>
        Candidate.findByIdAndUpdate(candidateId, { $inc: { voteCount: 1 } })
      )
    );

    // Mark voter as voted and expire credentials
    await Voter.findByIdAndUpdate(voter._id, {
      hasVoted: true,
      votedAt: new Date(),
      status: 'expired',
    });

    return NextResponse.json({
      success: true,
      message: 'Vote submitted successfully',
      data: {
        votesCount: votesToSave.length,
      },
    });
  } catch (error: any) {
    console.error('Submit vote error:', error);
    return NextResponse.json(
      { error: 'Failed to submit vote', details: error.message },
      { status: 500 }
    );
  }
}
