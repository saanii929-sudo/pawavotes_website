import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Voter from '@/models/Voter';
import Election from '@/models/Election';
import { verifyPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    // Find voter by token
    const voter = await Voter.findOne({ token: token.toUpperCase() });

    if (!voter) {
      return NextResponse.json(
        { error: 'Invalid token or password' },
        { status: 401 }
      );
    }

    // Check if voter status is active
    if (voter.status !== 'active') {
      if (voter.status === 'expired') {
        return NextResponse.json(
          { error: 'Your voting credentials have expired. You have already voted.' },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: 'Your voting access has been disabled' },
        { status: 403 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, voter.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid token or password' },
        { status: 401 }
      );
    }

    // Get election details
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

    let electionStatus = 'upcoming';
    if (now >= startDate && now <= endDate) {
      electionStatus = 'active';
    } else if (now > endDate) {
      electionStatus = 'ended';
    }

    // Return voter data (without password)
    const voterData = {
      id: voter._id,
      name: voter.name,
      email: voter.email,
      token: voter.token,
      hasVoted: voter.hasVoted,
      electionId: voter.electionId,
      election: {
        id: election._id,
        title: election.title,
        description: election.description,
        startDate: election.startDate,
        endDate: election.endDate,
        status: electionStatus,
        settings: election.settings,
      },
    };

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      data: voterData,
    });
  } catch (error: any) {
    console.error('Voter login error:', error);
    return NextResponse.json(
      { error: 'Login failed', details: error.message },
      { status: 500 }
    );
  }
}
