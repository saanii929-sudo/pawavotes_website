import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PendingVote from '@/models/PendingVote';
import Vote from '@/models/Vote';
import Nominee from '@/models/Nominee';
import Category from '@/models/Category';
import Award from '@/models/Award';


export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const reference = searchParams.get('reference');
    const phone = searchParams.get('phone');

    if (!reference && !phone) {
      return NextResponse.json(
        { error: 'Either reference or phone number is required' },
        { status: 400 }
      );
    }
    let pendingVote;
    if (reference) {
      pendingVote = await PendingVote.findOne({ reference });
    } else if (phone) {
      pendingVote = await PendingVote.findOne({ 
        phone,
        reference: { $regex: /^USSD-/ }
      }).sort({ createdAt: -1 });
    }

    if (!pendingVote) {
      return NextResponse.json(
        { error: 'Vote not found' },
        { status: 404 }
      );
    }
    if (pendingVote.status === 'completed') {
      const vote = await Vote.findOne({ paymentReference: pendingVote.reference })
        .populate('nomineeId', 'name')
        .lean();

      return NextResponse.json({
        success: true,
        status: 'completed',
        message: 'Vote has been recorded successfully',
        vote: {
          nominee: vote?.nomineeId?.name || 'Unknown',
          votes: pendingVote.numberOfVotes,
          amount: pendingVote.amount,
          reference: pendingVote.reference,
        },
      });
    }
    if (pendingVote.status === 'failed') {
      return NextResponse.json({
        success: false,
        status: 'failed',
        message: 'Payment was not successful',
      });
    }

    // Still pending - check with Hubtel Transaction Status Check API
    console.log('Vote still pending, checking with Hubtel Status API');

    try {
      const hubtelApiId = process.env.HUBTEL_API_ID;
      const hubtelApiKey = process.env.HUBTEL_API_KEY;
      const hubtelMerchantAccount = process.env.HUBTEL_MERCHANT_ACCOUNT;

      if (!hubtelApiId || !hubtelApiKey || !hubtelMerchantAccount) {
        throw new Error('Hubtel credentials not configured');
      }

      // Call Hubtel Transaction Status Check API
      const statusUrl = `https://api-txnstatus.hubtel.com/transactions/${hubtelMerchantAccount}/status?clientReference=${pendingVote.reference}`;
      
      console.log('Calling Hubtel Status Check API:', statusUrl);

      const statusResponse = await fetch(statusUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${hubtelApiId}:${hubtelApiKey}`).toString('base64')}`,
        },
      });

      const statusData = await statusResponse.json();
      
      console.log('Hubtel status response:', statusData);

      if (statusResponse.ok && statusData.responseCode === '0000') {
        const paymentStatus = statusData.data.status; // Paid, Unpaid, or Refunded
        
        if (paymentStatus === 'Paid') {
          // Payment confirmed! Process the vote locally
          console.log('Payment confirmed by Hubtel, processing vote locally');
          
          await processVoteLocally(pendingVote, statusData.data);
          
          const nominee = await Nominee.findById(pendingVote.nomineeId).select('name').lean();
          
          return NextResponse.json({
            success: true,
            status: 'completed',
            message: 'Vote has been recorded successfully',
            vote: {
              nominee: nominee?.name || 'Unknown',
              votes: pendingVote.numberOfVotes,
              amount: pendingVote.amount,
              reference: pendingVote.reference,
            },
          });
        } else if (paymentStatus === 'Unpaid') {
          return NextResponse.json({
            success: false,
            status: 'pending',
            message: 'Payment is still pending. Please approve the payment on your phone.',
          });
        } else if (paymentStatus === 'Refunded') {
          // Mark as failed
          pendingVote.status = 'failed';
          await pendingVote.save();
          
          return NextResponse.json({
            success: false,
            status: 'failed',
            message: 'Payment was refunded',
          });
        }
      } else {
        console.error('Hubtel status check failed:', statusData);
        
        // Return pending status if we can't verify
        return NextResponse.json({
          success: false,
          status: 'pending',
          message: 'Unable to verify payment status. Please try again in a moment.',
        });
      }
    } catch (statusError) {
      console.error('Status check error:', statusError);
      
      // Return pending status if check fails
      return NextResponse.json({
        success: false,
        status: 'pending',
        message: 'Unable to verify payment status. Please try again in a moment.',
      });
    }

    // Default: still pending
    return NextResponse.json({
      success: false,
      status: 'pending',
      message: 'Payment is still being processed',
    });
  } catch (error: any) {
    console.error('USSD vote status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check vote status', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to process vote locally when webhook is not received
async function processVoteLocally(pendingVote: any, hubtelData?: any) {
  console.log('Creating USSD vote locally:', {
    reference: pendingVote.reference,
    nominee: pendingVote.nomineeId,
    votes: pendingVote.numberOfVotes,
  });

  // Create the vote record
  const voteData = {
    awardId: pendingVote.awardId,
    categoryId: pendingVote.categoryId,
    nomineeId: pendingVote.nomineeId,
    voterEmail: pendingVote.email,
    voterPhone: pendingVote.phone,
    numberOfVotes: pendingVote.numberOfVotes,
    amount: pendingVote.amount,
    paymentReference: pendingVote.reference,
    paymentMethod: hubtelData?.paymentMethod || 'ussd',
    paymentStatus: 'completed' as const,
  };

  await Vote.create(voteData);

  // Update nominee vote count
  await Nominee.findByIdAndUpdate(pendingVote.nomineeId, {
    $inc: { voteCount: pendingVote.numberOfVotes },
  });

  // Update category vote count
  await Category.findByIdAndUpdate(pendingVote.categoryId, {
    $inc: { voteCount: pendingVote.numberOfVotes },
  });

  // Update award vote count
  await Award.findByIdAndUpdate(pendingVote.awardId, {
    $inc: { totalVotes: pendingVote.numberOfVotes },
  });

  // Mark pending vote as completed
  pendingVote.status = 'completed';
  if (hubtelData) {
    pendingVote.paymentData = hubtelData;
  }
  await pendingVote.save();
  
  console.log('USSD vote processed locally successfully');
}
