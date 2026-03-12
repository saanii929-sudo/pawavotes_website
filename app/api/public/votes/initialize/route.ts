import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PendingVote from '@/models/PendingVote';
import Award from '@/models/Award';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { awardId, categoryId, nomineeId, email, phone, numberOfVotes, amount, bulkPackageId } = body;

    console.log('Initialize vote - received data:', {
      awardId,
      categoryId,
      nomineeId,
      numberOfVotes,
      amount,
      bulkPackageId,
    });

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

    // Generate unique reference (max 32 characters as per Hubtel requirement)
    const reference = `VOTE${Date.now()}${crypto.randomBytes(2).toString('hex')}`.substring(0, 32);

    // Store pending vote in database
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

    console.log('Creating pending vote with data:', pendingVoteData);

    const pendingVote = await PendingVote.create(pendingVoteData);

    // Get Hubtel credentials from environment
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

    console.log('Using Hubtel credentials:', {
      apiId: hubtelApiId,
      apiKeyLength: hubtelApiKey.length,
      merchantAccount: hubtelMerchantAccount,
    });

    // Initialize Hubtel payment
    const hubtelPayload: any = {
      totalAmount: amount,
      description: `Vote for nominee - ${numberOfVotes} vote${numberOfVotes > 1 ? 's' : ''}`,
      callbackUrl,
      returnUrl,
      merchantAccountNumber: hubtelMerchantAccount,
      cancellationUrl,
      clientReference: reference,
    };

    // Only add optional fields if they exist
    if (email) hubtelPayload.payeeEmail = email;
    if (phone) hubtelPayload.payeeMobileNumber = phone;
    if (email) hubtelPayload.payeeName = email;

    console.log('Initializing Hubtel payment:', hubtelPayload);

    const authString = `${hubtelApiId}:${hubtelApiKey}`;
    const base64Auth = Buffer.from(authString).toString('base64');
    
    console.log('Auth details:', {
      authStringLength: authString.length,
      base64Length: base64Auth.length,
      authHeader: `Basic ${base64Auth.substring(0, 20)}...`,
    });

    const hubtelResponse = await fetch('https://payproxyapi.hubtel.com/items/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${base64Auth}`,
      },
      body: JSON.stringify(hubtelPayload),
    });

    console.log('Hubtel response status:', hubtelResponse.status);
    console.log('Hubtel response headers:', Object.fromEntries(hubtelResponse.headers.entries()));

    // Get response text first to handle potential JSON parsing errors
    const responseText = await hubtelResponse.text();
    console.log('Hubtel raw response:', responseText);

    // Handle 401 Unauthorized specifically
    if (hubtelResponse.status === 401) {
      console.error('Hubtel authentication failed - Invalid credentials');
      return NextResponse.json(
        { 
          error: 'Payment system authentication failed', 
          details: 'The payment gateway credentials are invalid or expired. Please contact support.',
          hint: 'Check HUBTEL_API_ID and HUBTEL_API_KEY in environment variables'
        },
        { status: 500 }
      );
    }

    let hubtelData;
    try {
      hubtelData = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      console.error('Failed to parse Hubtel response:', parseError);
      console.error('Response text:', responseText);
      return NextResponse.json(
        { 
          error: 'Failed to initialize payment', 
          details: 'Invalid response from payment gateway',
          rawResponse: responseText.substring(0, 200) // First 200 chars for debugging
        },
        { status: 500 }
      );
    }

    console.log('Hubtel parsed response:', hubtelData);

    if (!hubtelResponse.ok || hubtelData.responseCode !== '0000') {
      console.error('Hubtel initialization error:', hubtelData);
      return NextResponse.json(
        { error: 'Failed to initialize payment', details: hubtelData.message || 'Unknown error' },
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
    console.error('Initialize vote error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize payment', details: error.message },
      { status: 500 }
    );
  }
}
