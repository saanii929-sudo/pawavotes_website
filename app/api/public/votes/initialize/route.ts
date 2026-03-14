import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PendingVote from '@/models/PendingVote';
import Award from '@/models/Award';
import crypto from 'crypto';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 10 vote initializations per minute per IP
    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(`vote-init:${ip}`, 10, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Try again in ${rl.resetIn} seconds.` },
        { status: 429 }
      );
    }

    await connectDB();

    const body = await req.json();
    const { awardId, categoryId, nomineeId, email, phone, numberOfVotes, amount, bulkPackageId } = body;
    if (!awardId || !categoryId || !nomineeId || !email || !phone || !numberOfVotes || !amount) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate vote count and amount bounds
    if (typeof numberOfVotes !== 'number' || numberOfVotes < 1 || numberOfVotes > 10000 || !Number.isInteger(numberOfVotes)) {
      return NextResponse.json({ error: 'Invalid vote count' }, { status: 400 });
    }
    if (typeof amount !== 'number' || amount <= 0 || amount > 100000) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }
    // Basic email format check
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

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
    const reference = `VOTE${Date.now()}${crypto.randomBytes(2).toString('hex')}`.substring(0, 32);
    const pendingVoteData = {
      reference,
      awardId,
      categoryId,
      nomineeId,
      email: email.toLowerCase(),
      phone,
      numberOfVotes,
      amount,
      status: 'pending' as const,
      ...(bulkPackageId && { bulkPackageId }),
    };

    const pendingVote = await PendingVote.create(pendingVoteData);
    const hubtelApiId = process.env.HUBTEL_API_ID;
    const hubtelApiKey = process.env.HUBTEL_API_KEY;
    const hubtelMerchantAccount = process.env.HUBTEL_MERCHANT_ACCOUNT;
    const callbackUrl = process.env.HUBTEL_CALLBACK_URL || `${process.env.NEXT_PUBLIC_API_URL}/api/webhooks/hubtel`;
    const returnUrl = process.env.HUBTEL_RETURN_URL || `${process.env.NEXT_PUBLIC_API_URL}/vote-success`;
    const cancellationUrl = process.env.HUBTEL_CANCELLATION_URL || process.env.NEXT_PUBLIC_API_URL;

    if (!hubtelApiId || !hubtelApiKey || !hubtelMerchantAccount) {
      console.error('Hubtel credentials not configured');
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      );
    }
    const hubtelPayload: any = {
      totalAmount: amount,
      description: `Vote for nominee - ${numberOfVotes} vote${numberOfVotes > 1 ? 's' : ''}`,
      callbackUrl,
      returnUrl,
      merchantAccountNumber: hubtelMerchantAccount,
      cancellationUrl,
      clientReference: reference,
    };
    if (email) hubtelPayload.payeeEmail = email;
    if (phone) hubtelPayload.payeeMobileNumber = phone;
    if (email) hubtelPayload.payeeName = email;


    const authString = `${hubtelApiId}:${hubtelApiKey}`;
    const base64Auth = Buffer.from(authString).toString('base64');

    const hubtelResponse = await fetch('https://payproxyapi.hubtel.com/items/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${base64Auth}`,
      },
      body: JSON.stringify(hubtelPayload),
    });
    const responseText = await hubtelResponse.text();
    if (hubtelResponse.status === 401) {
      return NextResponse.json(
        { error: 'Payment system temporarily unavailable. Please try again later.' },
        { status: 500 }
      );
    }

    let hubtelData;
    try {
      hubtelData = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Failed to initialize payment' },
        { status: 500 }
      );
    }

    if (!hubtelResponse.ok || hubtelData.responseCode !== '0000') {
      return NextResponse.json(
        { error: 'Failed to initialize payment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reference: pendingVote.reference,
      checkoutUrl: hubtelData.data.checkoutUrl,
      checkoutId: hubtelData.data.checkoutId,
      checkoutDirectUrl: hubtelData.data.checkoutDirectUrl,
      message: 'Payment initialized successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to initialize payment', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
