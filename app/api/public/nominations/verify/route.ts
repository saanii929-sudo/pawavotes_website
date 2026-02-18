import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Nominee from '@/models/Nominee';
import Award from '@/models/Award';
import Category from '@/models/Category';
import Payment from '@/models/Payment';
import PendingNomination from '@/models/PendingNomination';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { reference } = body;

    if (!reference) {
      return NextResponse.json(
        { error: 'Payment reference is required' },
        { status: 400 }
      );
    }

    // Get pending nomination from database
    const pendingNomination = await PendingNomination.findOne({ reference });

    if (!pendingNomination) {
      return NextResponse.json(
        { error: 'Nomination record not found' },
        { status: 404 }
      );
    }

    // Check if already processed
    if (pendingNomination.status === 'completed') {
      return NextResponse.json(
        { error: 'Nomination already processed' },
        { status: 400 }
      );
    }

    // Verify payment with Paystack
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    
    if (!paystackSecretKey) {
      console.error('Paystack secret key not configured');
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      );
    }

    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
        },
      }
    );

    const verifyData = await verifyResponse.json();

    if (!verifyResponse.ok || !verifyData.status) {
      pendingNomination.status = 'failed';
      await pendingNomination.save();
      
      return NextResponse.json(
        { error: 'Payment verification failed' },
        { status: 400 }
      );
    }

    // Check if payment was successful
    if (verifyData.data.status !== 'success') {
      pendingNomination.status = 'failed';
      await pendingNomination.save();
      
      return NextResponse.json(
        { error: 'Payment was not successful' },
        { status: 400 }
      );
    }

    // Create nominee
    const nominee = await Nominee.create({
      name: pendingNomination.name,
      email: pendingNomination.email,
      phone: pendingNomination.phone || undefined,
      awardId: pendingNomination.awardId,
      categoryId: pendingNomination.categoryId,
      image: pendingNomination.image || undefined,
      bio: pendingNomination.bio || undefined,
      status: 'draft', // Draft status until admin approves
      nominationStatus: 'pending', // Pending approval
      nominationType: 'self',
      voteCount: 0,
    });

    // Record payment
    await Payment.create({
      transactionId: reference,
      nomineeId: nominee._id.toString(),
      awardId: pendingNomination.awardId,
      paymentMethod: 'mobile_money',
      amount: pendingNomination.amount,
      currency: 'GHS',
      voteCount: 0, // This is a nomination payment, not a vote
      status: 'successful',
      reference,
    });

    // Update category nominee count
    await Category.findByIdAndUpdate(pendingNomination.categoryId, {
      $inc: { nomineeCount: 1 },
    });

    // Update award nominee count
    await Award.findByIdAndUpdate(pendingNomination.awardId, {
      $inc: { totalNominees: 1 },
    });

    // Mark as completed
    pendingNomination.status = 'completed';
    await pendingNomination.save();

    return NextResponse.json({
      success: true,
      nominee,
      message: 'Nomination submitted and payment confirmed',
    });
  } catch (error: any) {
    console.error('Verify nomination error:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment', details: error.message },
      { status: 500 }
    );
  }
}
