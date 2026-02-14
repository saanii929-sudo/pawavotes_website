import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Transfer from '@/models/Transfer';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    // Verify Paystack signature
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      return NextResponse.json({ error: 'Paystack not configured' }, { status: 500 });
    }

    const body = await req.text();
    const signature = req.headers.get('x-paystack-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature provided' }, { status: 400 });
    }

    // Validate signature
    const hash = crypto
      .createHmac('sha512', paystackSecretKey)
      .update(body)
      .digest('hex');

    if (hash !== signature) {
      console.error('Invalid Paystack signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(body);
    console.log('Paystack webhook event:', event.event);

    // Handle charge/payment events (for USSD voting)
    if (event.event === 'charge.success') {
      const reference = event.data.reference;
      
      // Update vote payment status
      const Vote = (await import('@/models/Vote')).default;
      const vote = await Vote.findOne({ paymentReference: reference });
      
      if (vote) {
        vote.paymentStatus = 'completed';
        await vote.save();
        
        console.log(`Vote payment ${reference} marked as completed`);
      }
    } else if (event.event === 'charge.failed') {
      const reference = event.data.reference;
      
      const Vote = (await import('@/models/Vote')).default;
      const vote = await Vote.findOne({ paymentReference: reference });
      
      if (vote) {
        vote.paymentStatus = 'failed';
        await vote.save();
        
        console.log(`Vote payment ${reference} marked as failed`);
      }
    }

    // Handle transfer events
    if (event.event === 'transfer.success') {
      const transferCode = event.data.transfer_code;
      
      const transfer = await Transfer.findOne({ referenceId: transferCode });
      
      if (transfer) {
        transfer.status = 'successful';
        transfer.paystackData = event.data;
        await transfer.save();
        
        console.log(`Transfer ${transferCode} marked as successful`);
      }
    } else if (event.event === 'transfer.failed') {
      const transferCode = event.data.transfer_code;
      
      const transfer = await Transfer.findOne({ referenceId: transferCode });
      
      if (transfer) {
        transfer.status = 'failed';
        transfer.paystackData = event.data;
        await transfer.save();
        
        console.log(`Transfer ${transferCode} marked as failed`);
      }
    } else if (event.event === 'transfer.reversed') {
      const transferCode = event.data.transfer_code;
      
      const transfer = await Transfer.findOne({ referenceId: transferCode });
      
      if (transfer) {
        transfer.status = 'failed';
        transfer.notes = 'Transfer was reversed';
        transfer.paystackData = event.data;
        await transfer.save();
        
        console.log(`Transfer ${transferCode} was reversed`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Paystack webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 500 }
    );
  }
}
