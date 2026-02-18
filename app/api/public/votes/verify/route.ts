import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PendingVote from '@/models/PendingVote';
import Vote from '@/models/Vote';
import Nominee from '@/models/Nominee';
import Category from '@/models/Category';
import Award from '@/models/Award';
import NomineeCampaign from '@/models/NomineeCampaign';

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

    // Find pending vote
    const pendingVote = await PendingVote.findOne({ reference });

    if (!pendingVote) {
      return NextResponse.json(
        { error: 'Vote record not found' },
        { status: 404 }
      );
    }

    // Check if already processed
    if (pendingVote.status === 'completed') {
      return NextResponse.json(
        { error: 'Vote already processed' },
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
      pendingVote.status = 'failed';
      await pendingVote.save();
      
      return NextResponse.json(
        { error: 'Payment verification failed' },
        { status: 400 }
      );
    }

    // Check if payment was successful
    if (verifyData.data.status !== 'success') {
      pendingVote.status = 'failed';
      pendingVote.paymentData = verifyData.data;
      await pendingVote.save();
      
      return NextResponse.json(
        { error: 'Payment was not successful' },
        { status: 400 }
      );
    }

    // Record the vote
    console.log('Creating vote record:', {
      numberOfVotes: pendingVote.numberOfVotes,
      amount: pendingVote.amount,
      bulkPackageId: pendingVote.bulkPackageId,
      reference,
    });
    
    const voteData = {
      awardId: pendingVote.awardId,
      categoryId: pendingVote.categoryId,
      nomineeId: pendingVote.nomineeId,
      voterEmail: pendingVote.email,
      voterPhone: pendingVote.phone,
      numberOfVotes: pendingVote.numberOfVotes,
      amount: pendingVote.amount,
      paymentReference: reference,
      paymentMethod: 'mobile_money',
      paymentStatus: 'completed' as const,
      ...(pendingVote.bulkPackageId && { bulkPackageId: pendingVote.bulkPackageId }),
    };

    console.log('Vote data to be saved:', voteData);
    
    const vote = await Vote.create(voteData);
    
    console.log('Vote created successfully:', vote);

    // Update nominee vote count
    await Nominee.findByIdAndUpdate(
      pendingVote.nomineeId,
      { $inc: { voteCount: pendingVote.numberOfVotes } }
    );

    // Update category vote count
    await Category.findByIdAndUpdate(
      pendingVote.categoryId,
      { $inc: { voteCount: pendingVote.numberOfVotes } }
    );

    // Update award vote count
    await Award.findByIdAndUpdate(
      pendingVote.awardId,
      { $inc: { totalVotes: pendingVote.numberOfVotes } }
    );

    // Update campaign if exists
    try {
      const campaign = await NomineeCampaign.findOne({
        nomineeId: pendingVote.nomineeId,
        status: 'active',
      });

      if (campaign) {
        // Add to current amount
        campaign.currentAmount = (campaign.currentAmount || 0) + pendingVote.amount;
        
        // Add supporter if not already in list
        const supporterExists = campaign.supporters.some(
          (s: any) => s.email === pendingVote.email
        );
        
        if (!supporterExists) {
          campaign.supporters.push({
            name: pendingVote.email,
            email: pendingVote.email,
            phone: pendingVote.phone,
            amount: pendingVote.amount,
            joinedAt: new Date(),
          });
        } else {
          // Update existing supporter
          const supporter = campaign.supporters.find(
            (s: any) => s.email === pendingVote.email
          );
          if (supporter) {
            supporter.amount = (supporter.amount || 0) + pendingVote.amount;
          }
        }

        // Update analytics
        campaign.analytics.donations = (campaign.analytics.donations || 0) + 1;

        await campaign.save();
        console.log('Campaign updated:', campaign._id);
      }
    } catch (campaignError) {
      console.error('Failed to update campaign:', campaignError);
      // Don't fail the vote if campaign update fails
    }

    // Mark pending vote as completed
    pendingVote.status = 'completed';
    pendingVote.paymentData = verifyData.data;
    await pendingVote.save();

    return NextResponse.json({
      success: true,
      message: 'Vote recorded successfully',
      votes: pendingVote.numberOfVotes,
    });
  } catch (error: any) {
    console.error('Verify vote error:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment', details: error.message },
      { status: 500 }
    );
  }
}
