import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Transfer from '@/models/Transfer';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    
    console.log('Hubtel transfer callback received:', JSON.stringify(body, null, 2));

    const { ResponseCode, Data } = body;

    if (!Data || !Data.ClientReference) {
      console.error('Invalid callback payload:', body);
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const {
      ClientReference,
      TransactionId,
      ExternalTransactionId,
      Description,
      Amount,
      AmountDebited,
      Charges,
      RecipientName,
    } = Data;

    console.log(`Hubtel transfer callback - Reference: ${ClientReference}, ResponseCode: ${ResponseCode}`);

    // Find transfer by reference
    const transfer = await Transfer.findOne({ referenceId: ClientReference });

    if (!transfer) {
      console.error(`Transfer not found for reference: ${ClientReference}`);
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    // Update transfer with callback data
    transfer.hubtelData = body;

    if (ResponseCode === '0000') {
      // Successful transfer
      transfer.status = 'completed';
      transfer.notes = `${transfer.notes || ''}\nCompleted: ${Description}`.trim();
      
      console.log(`Transfer completed successfully:`, {
        reference: ClientReference,
        transactionId: TransactionId,
        externalTransactionId: ExternalTransactionId,
        amount: Amount,
        charges: Charges,
        recipient: RecipientName,
      });

      await transfer.save();

      // TODO: Send success email to organizer
      
      return NextResponse.json({ 
        message: 'Transfer completed successfully',
        success: true 
      });
    } else {
      // Failed transfer
      transfer.status = 'failed';
      transfer.notes = `${transfer.notes || ''}\nFailed: ${Description}`.trim();
      
      console.error(`Transfer failed:`, {
        reference: ClientReference,
        responseCode: ResponseCode,
        description: Description,
      });

      await transfer.save();

      // TODO: Send failure email to organizer and admin
      
      return NextResponse.json({ 
        message: 'Transfer failed',
        success: false 
      });
    }
  } catch (error: any) {
    console.error('Hubtel transfer callback error:', error);
    return NextResponse.json(
      { error: 'Callback processing failed', details: error.message },
      { status: 500 }
    );
  }
}
