import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PendingVote from '@/models/PendingVote';
import PendingNomination from '@/models/PendingNomination';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const clientReference = searchParams.get('clientReference');

    if (!clientReference) {
      return NextResponse.json(
        { error: 'clientReference is required' },
        { status: 400 }
      );
    }

    // Get Hubtel credentials
    const hubtelApiId = process.env.HUBTEL_API_ID;
    const hubtelApiKey = process.env.HUBTEL_API_KEY;
    const hubtelMerchantAccount = process.env.HUBTEL_MERCHANT_ACCOUNT;

    if (!hubtelApiId || !hubtelApiKey || !hubtelMerchantAccount) {
      console.error('Hubtel credentials not configured');
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      );
    }

    // Check transaction status with Hubtel
    const statusUrl = `https://api-txnstatus.hubtel.com/transactions/${hubtelMerchantAccount}/status?clientReference=${clientReference}`;
  

    const statusResponse = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${hubtelApiId}:${hubtelApiKey}`).toString('base64')}`,
      },
    });

    const statusData = await statusResponse.json();

    if (!statusResponse.ok || statusData.responseCode !== '0000') {
      return NextResponse.json(
        { error: 'Failed to check transaction status', details: statusData.message },
        { status: 500 }
      );
    }
    let pendingTransaction;
    let transactionType: 'vote' | 'nomination';

    if (clientReference.startsWith('VOTE') || clientReference.startsWith('USSD')) {
      pendingTransaction = await PendingVote.findOne({ reference: clientReference });
      transactionType = 'vote';
    } else if (clientReference.startsWith('NOM')) {
      pendingTransaction = await PendingNomination.findOne({ reference: clientReference });
      transactionType = 'nomination';
    } else {
      return NextResponse.json(
        { error: 'Invalid reference format' },
        { status: 400 }
      );
    }

    if (!pendingTransaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Return combined status
    return NextResponse.json({
      success: true,
      clientReference,
      transactionType,
      hubtelStatus: statusData.data.status,
      localStatus: pendingTransaction.status,
      amount: statusData.data.amount,
      paymentMethod: statusData.data.paymentMethod,
      transactionId: statusData.data.transactionId,
      date: statusData.data.date,
      needsProcessing: statusData.data.status === 'Paid' && pendingTransaction.status === 'pending',
    });
  } catch (error: any) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check status', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
