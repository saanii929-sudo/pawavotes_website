import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Nominee from '@/models/Nominee';
import Award from '@/models/Award';
import Category from '@/models/Category';
import Payment from '@/models/Payment';
import PendingNomination from '@/models/PendingNomination';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(`nom-verify:${ip}`, 15, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
    }

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
        { success: true, message: 'Nomination already processed' },
        { status: 200 }
      );
    }

    // For Hubtel, payment verification happens via webhook
    // This endpoint is called after redirect, so we just check the status
    
    if (pendingNomination.status === 'failed') {
      return NextResponse.json(
        { error: 'Payment was not successful' },
        { status: 400 }
      );
    }

    // If still pending, wait a moment and check again (webhook might be processing)
    if (pendingNomination.status === 'pending') {
      // Wait 2 seconds for webhook to process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Refresh the pending nomination
      let updatedPendingNomination = await PendingNomination.findOne({ reference });
      
      if (updatedPendingNomination?.status === 'completed') {
        return NextResponse.json({
          success: true,
          message: 'Nomination submitted and payment confirmed',
        });
      }
      
      if (updatedPendingNomination?.status === 'failed') {
        return NextResponse.json(
          { error: 'Payment was not successful' },
          { status: 400 }
        );
      }
      try {
        const hubtelApiId = process.env.HUBTEL_API_ID;
        const hubtelApiKey = process.env.HUBTEL_API_KEY;
        const hubtelMerchantAccount = process.env.HUBTEL_MERCHANT_ACCOUNT;

        if (!hubtelApiId || !hubtelApiKey || !hubtelMerchantAccount) {
          throw new Error('Hubtel credentials not configured');
        }
        const statusUrl = `https://api-txnstatus.hubtel.com/transactions/${hubtelMerchantAccount}/status?clientReference=${reference}`;
        
        const statusResponse = await fetch(statusUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${hubtelApiId}:${hubtelApiKey}`).toString('base64')}`,
          },
        });
        const responseText = await statusResponse.text();

        let statusData;
        try {
          statusData = JSON.parse(responseText);
        } catch (parseError) {
          // Failed to parse Hubtel status response
        
          if (responseText.includes('<html') || responseText.includes('<!DOCTYPE')) {
            throw new Error('Hubtel Status API returned HTML - check credentials or IP whitelist');
          }
          
          throw new Error('Invalid response from Hubtel Status API');
        }

        if (statusResponse.ok && statusData.responseCode === '0000') {
          const paymentStatus = statusData.data.status; // Paid, Unpaid, or Refunded
          
          if (paymentStatus === 'Paid') {
            
            await processNominationLocally(pendingNomination, statusData.data);
            
            return NextResponse.json({
              success: true,
              message: 'Nomination submitted and payment confirmed',
            });
          } else if (paymentStatus === 'Unpaid') {
            return NextResponse.json(
              { error: 'Payment is still pending. Please complete the payment.' },
              { status: 202 }
            );
          } else if (paymentStatus === 'Refunded') {
            // Mark as failed
            pendingNomination.status = 'failed';
            await pendingNomination.save();
            
            return NextResponse.json(
              { error: 'Payment was refunded.' },
              { status: 400 }
            );
          }
        } else {
          // Hubtel status check returned non-success
        }
      } catch (statusError) {
        // Status check failed
      }
      
      // Still pending - return pending status
      return NextResponse.json(
        { error: 'Payment is still being processed. Please check back in a moment.' },
        { status: 202 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Nomination submitted and payment confirmed',
    });
  } catch (error: any) {
    console.error('Verify nomination error');
    return NextResponse.json(
      { error: 'Failed to verify payment', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

async function processNominationLocally(pendingNomination: any, hubtelData?: any) {
  
  const nominee = await Nominee.create({
    name: pendingNomination.name,
    email: pendingNomination.email,
    phone: pendingNomination.phone || undefined,
    awardId: pendingNomination.awardId,
    categoryId: pendingNomination.categoryId,
    image: pendingNomination.image || undefined,
    bio: pendingNomination.bio || undefined,
    status: 'draft',
    nominationStatus: 'pending',
    nominationType: 'self',
    voteCount: 0,
  });

  await Payment.create({
    transactionId: pendingNomination.reference,
    nomineeId: nominee._id.toString(),
    awardId: pendingNomination.awardId,
    paymentMethod: hubtelData?.paymentMethod || 'mobile_money',
    amount: pendingNomination.amount,
    currency: 'GHS',
    voteCount: 0,
    status: 'successful',
    reference: pendingNomination.reference,
  });
  await Category.findByIdAndUpdate(pendingNomination.categoryId, {
    $inc: { nomineeCount: 1 },
  });

  // Update award nominee count
  await Award.findByIdAndUpdate(pendingNomination.awardId, {
    $inc: { totalNominees: 1 },
  });

  // Mark as completed
  pendingNomination.status = 'completed';
  if (hubtelData) {
    pendingNomination.paymentData = hubtelData;
  }
  await pendingNomination.save();
}
