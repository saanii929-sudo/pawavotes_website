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
          nominee: (vote?.nomineeId as any)?.name || 'Unknown',
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

    try {
      const hubtelApiId = process.env.HUBTEL_API_ID;
      const hubtelApiKey = process.env.HUBTEL_API_KEY;
      const hubtelPrepaidDepositId = process.env.HUBTEL_PREPAID_DEPOSIT_ID;

      if (!hubtelApiId || !hubtelApiKey || !hubtelPrepaidDepositId) {
        throw new Error('Hubtel credentials not configured');
      }
      const statusUrl = `https://smrsc.hubtel.com/api/merchants/${hubtelPrepaidDepositId}/transactions/status?clientReference=${pendingVote.reference}`;
      const authString = `${hubtelApiId}:${hubtelApiKey}`;
      const base64Auth = Buffer.from(authString).toString('base64');

      const statusResponse = await fetch(statusUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${base64Auth}`,
        },
      });

      const statusData = await statusResponse.json();

      if (statusResponse.ok && statusData.ResponseCode === 'success') {
        const transactionStatus = statusData.Data.transactionStatus;
        
        if (transactionStatus === 'success') {
          
          await processVoteLocally(pendingVote, statusData.Data);
          
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
        } else if (transactionStatus === 'pending') {
          return NextResponse.json({
            success: false,
            status: 'pending',
            message: 'Payment is still pending. Please approve the payment on your phone.',
          });
        } else if (transactionStatus === 'failed') {
          pendingVote.status = 'failed';
          pendingVote.paymentData = statusData.Data;
          await pendingVote.save();
          
          return NextResponse.json({
            success: false,
            status: 'failed',
            message: 'Payment failed',
          });
        }
      } else {
        return NextResponse.json({
          success: false,
          status: 'pending',
          message: 'Unable to verify payment status. Please try again in a moment.',
        });
      }
    } catch (statusError) {
      return NextResponse.json({
        success: false,
        status: 'pending',
        message: 'Unable to verify payment status. Please try again in a moment.',
      });
    }

    return NextResponse.json({
      success: false,
      status: 'pending',
      message: 'Payment is still being processed',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to check vote status', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

async function processVoteLocally(pendingVote: any, hubtelData?: any) {
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

  await Nominee.findByIdAndUpdate(pendingVote.nomineeId, {
    $inc: { voteCount: pendingVote.numberOfVotes },
  });
  await Category.findByIdAndUpdate(pendingVote.categoryId, {
    $inc: { voteCount: pendingVote.numberOfVotes },
  });

  await Award.findByIdAndUpdate(pendingVote.awardId, {
    $inc: { totalVotes: pendingVote.numberOfVotes },
  });

  pendingVote.status = 'completed';
  if (hubtelData) {
    pendingVote.paymentData = hubtelData;
  }
  await pendingVote.save();
}
