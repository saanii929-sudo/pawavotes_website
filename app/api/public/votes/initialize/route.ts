import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PendingVote from '@/models/PendingVote';
import Award from '@/models/Award';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { awardId, categoryId, nomineeId, email, phone, numberOfVotes, amount } = body;

    // Validate required fields
    if (!awardId || !categoryId || !nomineeId || !email || !phone || !numberOfVotes || !amount) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Verify award exists and allows public voting
    const award = await Award.findOne({
      _id: awardId,
      'settings.allowPublicVoting': true,
    });

    if (!award) {
      return NextResponse.json(
        { error: 'Award not found or voting not allowed' },
        { status: 404 }
      );
    }

    // Generate unique reference
    const reference = `VOTE_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // Store pending vote in database
    const pendingVote = await PendingVote.create({
      reference,
      awardId,
      categoryId,
      nomineeId,
      email: email.toLowerCase(),
      phone,
      numberOfVotes,
      amount,
      status: 'pending',
    });

    // Get Paystack public key from environment
    const paystackPublicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;

    if (!paystackPublicKey) {
      console.error('Paystack public key not configured');
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reference: pendingVote.reference,
      paystackPublicKey,
      message: 'Payment initialized successfully',
    });
  } catch (error: any) {
    console.error('Initialize vote error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize payment', details: error.message },
      { status: 500 }
    );
  }
}
