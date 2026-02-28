import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Vote from '@/models/Vote';
import Award from '@/models/Award';
import Nominee from '@/models/Nominee';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const {
      awardId,
      categoryId,
      nomineeId,
      voterEmail,
      voterPhone,
      numberOfVotes,
      amount,
    } = body;

    // Validate required fields
    if (!awardId || !categoryId || !nomineeId || !voterEmail || !voterPhone || !numberOfVotes || !amount) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Verify award exists and is active
    const award = await Award.findById(awardId);
    if (!award) {
      return NextResponse.json(
        { error: 'Award not found' },
        { status: 404 }
      );
    }

    if (award.status !== 'voting' && award.status !== 'active') {
      return NextResponse.json(
        { error: 'Voting is not active for this award' },
        { status: 400 }
      );
    }

    // Check if voting period is valid
    if (award.votingEndDate && new Date() > new Date(award.votingEndDate)) {
      return NextResponse.json(
        { error: 'Voting period has ended' },
        { status: 400 }
      );
    }

    // Verify nominee exists
    const nominee = await Nominee.findById(nomineeId);
    if (!nominee) {
      return NextResponse.json(
        { error: 'Nominee not found' },
        { status: 404 }
      );
    }

    // Generate unique payment reference
    const paymentReference = `VOTE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create vote record with pending status
    const vote = await Vote.create({
      awardId,
      categoryId,
      nomineeId,
      voterEmail: voterEmail.toLowerCase(),
      voterPhone,
      numberOfVotes,
      amount,
      paymentReference,
      paymentMethod: 'mobile_money',
      paymentStatus: 'pending',
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
    });

    // Initialize Paystack payment
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      return NextResponse.json(
        { error: 'Payment configuration error' },
        { status: 500 }
      );
    }

    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: voterEmail,
        amount: Math.round(amount * 100), // Convert to pesewas
        reference: paymentReference,
        callback_url: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/vote/callback`,
        metadata: {
          awardId,
          categoryId,
          nomineeId,
          nomineeName: nominee.name,
          numberOfVotes,
          voterPhone,
        },
        channels: ['mobile_money', 'card'],
      }),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackResponse.ok || !paystackData.status) {
      console.error('Paystack initialization error:', paystackData);
      return NextResponse.json(
        { error: 'Failed to initialize payment', details: paystackData.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      voteId: vote._id,
      paymentReference,
      authorizationUrl: paystackData.data.authorization_url,
      accessCode: paystackData.data.access_code,
    });
  } catch (error: any) {
    console.error('Vote initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate vote', details: error.message },
      { status: 500 }
    );
  }
}
