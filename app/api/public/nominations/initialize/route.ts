import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Award from '@/models/Award';
import Category from '@/models/Category';
import PendingNomination from '@/models/PendingNomination';
import crypto from 'crypto';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 5 nomination initializations per minute per IP
    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(`nom-init:${ip}`, 5, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Try again in ${rl.resetIn} seconds.` },
        { status: 429 }
      );
    }

    await connectDB();

    const body = await req.json();
    const { awardId, categoryId, name, email, phone, bio, image, amount } = body;

    if (!awardId || !categoryId || !name || !email || !amount) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      );
    }

    // Verify award exists
    const award = await Award.findById(awardId);
    if (!award) {
      return NextResponse.json(
        { error: 'Award not found' },
        { status: 404 }
      );
    }

    // Verify category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Generate unique reference (max 32 characters as per Hubtel requirement)
    const reference = `NOM${Date.now()}${crypto.randomBytes(2).toString('hex')}`.substring(0, 32);

    // Store pending nomination in database
    await PendingNomination.create({
      reference,
      awardId,
      categoryId,
      name,
      email,
      phone,
      bio,
      image,
      amount,
      status: 'pending',
    });

    // Get Hubtel credentials from environment
    const hubtelApiId = process.env.HUBTEL_API_ID;
    const hubtelApiKey = process.env.HUBTEL_API_KEY;
    const hubtelMerchantAccount = process.env.HUBTEL_MERCHANT_ACCOUNT;
    const callbackUrl = process.env.HUBTEL_CALLBACK_URL || `${process.env.NEXT_PUBLIC_API_URL}/api/webhooks/hubtel`;
    const returnUrl = `${process.env.NEXT_PUBLIC_API_URL}/nomination-success`; // Nomination-specific return URL
    const cancellationUrl = process.env.HUBTEL_CANCELLATION_URL || process.env.NEXT_PUBLIC_API_URL;

    if (!hubtelApiId || !hubtelApiKey || !hubtelMerchantAccount) {
      console.error('Hubtel credentials not configured');
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      );
    }

    // Initialize Hubtel payment
    const hubtelPayload: any = {
      totalAmount: amount / 100, // Convert from pesewas to cedis
      description: `Nomination fee for ${name} in ${category.name}`,
      callbackUrl,
      returnUrl,
      merchantAccountNumber: hubtelMerchantAccount,
      cancellationUrl,
      clientReference: reference,
      payeeName: name,
      payeeMobileNumber: phone || '',
      payeeEmail: email,
    };

    const hubtelResponse = await fetch('https://payproxyapi.hubtel.com/items/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${hubtelApiId}:${hubtelApiKey}`).toString('base64')}`,
      },
      body: JSON.stringify(hubtelPayload),
    });
    const responseText = await hubtelResponse.text();

    let hubtelData;
    try {
      hubtelData = JSON.parse(responseText);
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
      reference,
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

