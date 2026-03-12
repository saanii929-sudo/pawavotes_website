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
        { success: true, message: 'Vote already processed', votes: pendingVote.numberOfVotes },
        { status: 200 }
      );
    }

    // For Hubtel, payment verification happens via webhook
    // This endpoint is called after redirect, so we just check the status
    // The webhook should have already updated the status
    
    if (pendingVote.status === 'failed') {
      return NextResponse.json(
        { error: 'Payment was not successful' },
        { status: 400 }
      );
    }

    // If still pending, wait a moment and check again (webhook might be processing)
    if (pendingVote.status === 'pending') {
      // Wait 2 seconds for webhook to process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Refresh the pending vote
      let updatedPendingVote = await PendingVote.findOne({ reference });
      
      if (updatedPendingVote?.status === 'completed') {
        return NextResponse.json({
          success: true,
          message: 'Vote recorded successfully',
          votes: updatedPendingVote.numberOfVotes,
        });
      }
      
      if (updatedPendingVote?.status === 'failed') {
        return NextResponse.json(
          { error: 'Payment was not successful' },
          { status: 400 }
        );
      }
      
      // Still pending after 2 seconds - check with Hubtel directly using Transaction Status Check API
      console.log('Webhook not received, checking status with Hubtel Transaction Status Check API');
      
      try {
        const hubtelApiId = process.env.HUBTEL_API_ID;
        const hubtelApiKey = process.env.HUBTEL_API_KEY;
        const hubtelMerchantAccount = process.env.HUBTEL_MERCHANT_ACCOUNT;

        if (!hubtelApiId || !hubtelApiKey || !hubtelMerchantAccount) {
          throw new Error('Hubtel credentials not configured');
        }

        // Call Hubtel Transaction Status Check API directly
        const statusUrl = `https://api-txnstatus.hubtel.com/transactions/${hubtelMerchantAccount}/status?clientReference=${reference}`;
        
        console.log('Calling Hubtel Status Check API:', statusUrl);

        const statusResponse = await fetch(statusUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${hubtelApiId}:${hubtelApiKey}`).toString('base64')}`,
          },
        });

        console.log('Hubtel status response status:', statusResponse.status);
        console.log('Hubtel status response headers:', Object.fromEntries(statusResponse.headers.entries()));

        // Get response text first to handle non-JSON responses
        const responseText = await statusResponse.text();
        console.log('Hubtel status raw response:', responseText.substring(0, 500));

        let statusData;
        try {
          statusData = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Failed to parse Hubtel status response:', parseError);
          console.error('Response was:', responseText.substring(0, 200));
          
          // If we get HTML or non-JSON, it's likely an error (403, 401, etc.)
          if (responseText.includes('<html') || responseText.includes('<!DOCTYPE')) {
            console.error('Received HTML response - likely authentication or IP whitelisting issue');
            throw new Error('Hubtel Status API returned HTML - check credentials or IP whitelist');
          }
          
          throw new Error('Invalid response from Hubtel Status API');
        }
        
        console.log('Hubtel status parsed response:', statusData);

        if (statusResponse.ok && statusData.responseCode === '0000') {
          const paymentStatus = statusData.data.status; // Paid, Unpaid, or Refunded
          
          if (paymentStatus === 'Paid') {
            // Payment is confirmed by Hubtel, process locally
            console.log('Payment confirmed by Hubtel, processing vote locally');
            
            await processVoteLocally(pendingVote, statusData.data);
            
            return NextResponse.json({
              success: true,
              message: 'Vote recorded successfully',
              votes: pendingVote.numberOfVotes,
            });
          } else if (paymentStatus === 'Unpaid') {
            return NextResponse.json(
              { error: 'Payment is still pending. Please complete the payment.' },
              { status: 202 }
            );
          } else if (paymentStatus === 'Refunded') {
            // Mark as failed
            pendingVote.status = 'failed';
            await pendingVote.save();
            
            return NextResponse.json(
              { error: 'Payment was refunded.' },
              { status: 400 }
            );
          }
        } else {
          console.error('Hubtel status check failed:', statusData);
        }
      } catch (statusError) {
        console.error('Status check failed:', statusError);
      }
      
      // Still pending - return pending status
      return NextResponse.json(
        { error: 'Payment is still being processed. Please check back in a moment.' },
        { status: 202 }
      );
    }

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

// Helper function to process vote locally when webhook is not received
async function processVoteLocally(pendingVote: any, hubtelData?: any) {
  // Record the vote
  const voteData = {
    awardId: pendingVote.awardId,
    categoryId: pendingVote.categoryId,
    nomineeId: pendingVote.nomineeId,
    voterEmail: pendingVote.email,
    voterPhone: pendingVote.phone,
    numberOfVotes: pendingVote.numberOfVotes,
    amount: pendingVote.amount,
    paymentReference: pendingVote.reference,
    paymentMethod: hubtelData?.paymentMethod || 'mobile_money',
    paymentStatus: 'completed' as const,
    ...(pendingVote.bulkPackageId && { bulkPackageId: pendingVote.bulkPackageId }),
  };

  console.log('Creating vote locally:', voteData);

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

  // Update campaign if exists
  try {
    const campaign = await NomineeCampaign.findOne({
      nomineeId: pendingVote.nomineeId,
      status: 'active',
    });

    if (campaign) {
      campaign.currentAmount = (campaign.currentAmount || 0) + pendingVote.amount;
      
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
        const supporter = campaign.supporters.find(
          (s: any) => s.email === pendingVote.email
        );
        if (supporter) {
          supporter.amount = (supporter.amount || 0) + pendingVote.amount;
        }
      }

      campaign.analytics.donations = (campaign.analytics.donations || 0) + 1;
      await campaign.save();
    }
  } catch (campaignError) {
    console.error('Failed to update campaign:', campaignError);
  }

  // Mark pending vote as completed
  pendingVote.status = 'completed';
  if (hubtelData) {
    pendingVote.paymentData = hubtelData;
  }
  await pendingVote.save();
  
  console.log('Vote processed locally successfully');
}
