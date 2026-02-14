import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Award from '@/models/Award';
import Category from '@/models/Category';
import PendingNomination from '@/models/PendingNomination';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { awardId, categoryId, name, email, phone, bio, image, amount } = body;

    // Validate required fields
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

    // Generate unique reference
    const reference = `NOM_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

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

    // Get Paystack public key
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
      reference,
      paystackPublicKey,
      message: 'Payment initialized successfully',
    });
  } catch (error: any) {
    console.error('Initialize nomination error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize payment', details: error.message },
      { status: 500 }
    );
  }
}

