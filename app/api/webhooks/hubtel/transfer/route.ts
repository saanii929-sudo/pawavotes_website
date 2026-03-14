import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Transfer from '@/models/Transfer';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    const { ResponseCode, Data } = body;

    if (!Data || !Data.ClientReference) {
      console.error('Invalid callback payload');
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
    const transfer = await Transfer.findOne({ referenceId: ClientReference });

    if (!transfer) {
      console.error(`Transfer not found for reference: ${ClientReference}`);
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    transfer.hubtelData = body;

    if (ResponseCode === '0000') {
      // Successful transfer
      transfer.status = 'completed';
      transfer.notes = `${transfer.notes || ''}\nCompleted: ${Description}`.trim();
    

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
      
      console.error('Transfer failed:', { reference: ClientReference, responseCode: ResponseCode });

      await transfer.save();
      
      return NextResponse.json({ 
        message: 'Transfer failed',
        success: false 
      });
    }
  } catch (error: any) {
    console.error('Hubtel transfer callback error');
    return NextResponse.json(
      { error: 'Callback processing failed', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
