import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Transfer from '@/models/Transfer';
import { verifyToken } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Only superadmin can update withdrawal status
    if (decoded.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Access denied. Superadmin only.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status || !['successful', 'failed', 'approved'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status is required (approved or failed)' },
        { status: 400 }
      );
    }

    const transfer = await Transfer.findById(id);

    if (!transfer) {
      return NextResponse.json(
        { error: 'Transfer not found' },
        { status: 404 }
      );
    }

    if (transfer.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending transfers can be updated' },
        { status: 400 }
      );
    }

    // If rejecting, just update status
    if (status === 'failed') {
      transfer.status = 'failed';
      transfer.notes = transfer.notes ? `${transfer.notes} | Rejected by admin` : 'Rejected by admin';
      await transfer.save();

      console.log(`Transfer ${id} rejected by superadmin`);

      return NextResponse.json({
        success: true,
        message: 'Transfer rejected',
        data: transfer,
      });
    }

    // If approving, initiate Paystack transfer
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      console.error('Paystack secret key not configured');
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      );
    }

    // Create or get Paystack transfer recipient
    let recipientCode = transfer.recipientCode;

    if (!recipientCode) {
      // Create new recipient on Paystack
      const recipientPayload: any = {
        type: transfer.transferType === 'bank' ? 'nuban' : 'mobile_money',
        name: transfer.recipientName,
        currency: 'GHS',
      };

      if (transfer.transferType === 'bank') {
        recipientPayload.account_number = transfer.recipientAccountNumber;
        recipientPayload.bank_code = getBankCode(transfer.recipientBank || '');
      } else {
        recipientPayload.account_number = transfer.recipientPhoneNumber;
        // Extract network from notes if available
        const networkMatch = transfer.notes?.match(/Network: (\w+)/);
        const network = networkMatch ? networkMatch[1] : 'MTN';
        recipientPayload.bank_code = network;
      }

      console.log('Creating Paystack recipient:', recipientPayload);

      const recipientResponse = await fetch('https://api.paystack.co/transferrecipient', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recipientPayload),
      });

      const recipientData = await recipientResponse.json();

      if (!recipientResponse.ok || !recipientData.status) {
        console.error('Failed to create Paystack recipient:', recipientData);
        return NextResponse.json(
          { error: 'Failed to create transfer recipient', details: recipientData.message },
          { status: 400 }
        );
      }

      recipientCode = recipientData.data.recipient_code;
      transfer.recipientCode = recipientCode;
    }

    // Initiate transfer on Paystack
    const transferPayload = {
      source: 'balance',
      amount: Math.round(transfer.amount * 100), // Convert to kobo/pesewas
      recipient: recipientCode,
      reason: `Withdrawal approval - ${transfer.referenceId}`,
    };

    console.log('Initiating Paystack transfer:', transferPayload);

    const transferResponse = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transferPayload),
    });

    const transferData = await transferResponse.json();

    if (!transferResponse.ok || !transferData.status) {
      console.error('Failed to initiate Paystack transfer:', transferData);
      
      // Save error details
      transfer.paystackData = transferData;
      transfer.notes = transfer.notes 
        ? `${transfer.notes} | Paystack error: ${transferData.message}` 
        : `Paystack error: ${transferData.message}`;
      await transfer.save();

      return NextResponse.json(
        { error: 'Failed to initiate transfer', details: transferData.message },
        { status: 400 }
      );
    }

    // Update transfer with Paystack data
    transfer.referenceId = transferData.data.transfer_code || transfer.referenceId;
    transfer.status = 'pending'; // Will be updated by webhook when Paystack processes
    transfer.paystackData = transferData.data;
    transfer.notes = transfer.notes 
      ? `${transfer.notes} | Approved and sent to Paystack` 
      : 'Approved and sent to Paystack';
    await transfer.save();

    console.log(`Transfer ${id} approved and sent to Paystack:`, transferData.data.transfer_code);

    return NextResponse.json({
      success: true,
      message: 'Transfer approved and sent to Paystack. Status will update automatically when processed.',
      data: transfer,
      paystackTransferCode: transferData.data.transfer_code,
    });
  } catch (error: any) {
    console.error('Update withdrawal error:', error);
    return NextResponse.json(
      { error: 'Failed to update withdrawal', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to map bank names to Paystack bank codes
function getBankCode(bankName: string): string {
  const bankCodes: Record<string, string> = {
    'GCB Bank': '040',
    'Ecobank': '130',
    'Stanbic Bank': '190',
    'Absa Bank': '030',
    'Fidelity Bank': '240',
  };
  return bankCodes[bankName] || '040';
}
