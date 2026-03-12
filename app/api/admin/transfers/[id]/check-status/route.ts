import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Transfer from '@/models/Transfer';
import { verifyToken } from '@/lib/auth';

export async function GET(
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
    if (!decoded || decoded.role !== 'super-admin') {
      return NextResponse.json(
        { error: 'Only super admins can check transfer status' },
        { status: 403 }
      );
    }

    const { id: transferId } = await params;
    const transfer = await Transfer.findById(transferId);

    if (!transfer) {
      return NextResponse.json(
        { error: 'Transfer not found' },
        { status: 404 }
      );
    }

    if (transfer.status !== 'approved') {
      return NextResponse.json(
        { error: `Transfer is ${transfer.status}, not approved. Status check only works for approved transfers.` },
        { status: 400 }
      );
    }

    console.log('Checking transfer status with Hubtel:', {
      transferId,
      referenceId: transfer.referenceId,
    });

    // Call Hubtel Status Check API
    const statusResponse = await checkHubtelTransferStatus(transfer.referenceId);

    if (!statusResponse.success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to check transfer status',
        details: statusResponse.error,
      }, { status: 500 });
    }

    const statusData = statusResponse.data;
    
    console.log('Hubtel status check response:', statusData);

    // Update transfer based on status
    if (statusData.transactionStatus === 'success') {
      transfer.status = 'completed';
      transfer.hubtelData = {
        ...transfer.hubtelData,
        statusCheck: statusData,
      };
      transfer.notes = `${transfer.notes || ''}\nCompleted via status check`.trim();
      await transfer.save();

      return NextResponse.json({
        success: true,
        message: 'Transfer completed successfully',
        status: 'completed',
        data: transfer,
      });
    } else if (statusData.transactionStatus === 'failed') {
      transfer.status = 'failed';
      transfer.hubtelData = {
        ...transfer.hubtelData,
        statusCheck: statusData,
      };
      transfer.notes = `${transfer.notes || ''}\nFailed (verified via status check)`.trim();
      await transfer.save();

      return NextResponse.json({
        success: false,
        message: 'Transfer failed',
        status: 'failed',
        data: transfer,
      });
    } else {
      // Still pending
      return NextResponse.json({
        success: true,
        message: 'Transfer is still being processed',
        status: 'pending',
        data: {
          transfer,
          hubtelStatus: statusData,
        },
      });
    }
  } catch (error: any) {
    console.error('Transfer status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check transfer status', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to check Hubtel transfer status
async function checkHubtelTransferStatus(clientReference: string) {
  try {
    const hubtelApiId = process.env.HUBTEL_API_ID;
    const hubtelApiKey = process.env.HUBTEL_API_KEY;
    const hubtelPrepaidDepositId = process.env.HUBTEL_PREPAID_DEPOSIT_ID;

    if (!hubtelApiId || !hubtelApiKey || !hubtelPrepaidDepositId) {
      console.error('Hubtel credentials not configured');
      return { success: false, error: 'Hubtel credentials not configured' };
    }

    const authString = `${hubtelApiId}:${hubtelApiKey}`;
    const base64Auth = Buffer.from(authString).toString('base64');

    const url = `https://smrsc.hubtel.com/api/merchants/${hubtelPrepaidDepositId}/transactions/status?clientReference=${clientReference}`;
    
    console.log('Calling Hubtel Status Check API:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${base64Auth}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Hubtel status check failed:', response.status, errorText);
      
      if (response.status === 403) {
        return { 
          success: false, 
          error: 'IP not whitelisted. Contact Hubtel to whitelist your server IP.' 
        };
      }
      
      return { 
        success: false, 
        error: `HTTP ${response.status}: ${errorText}` 
      };
    }

    const responseText = await response.text();
    console.log('Hubtel status check raw response:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Hubtel response:', parseError);
      return { success: false, error: 'Invalid response from Hubtel' };
    }

    if (data.ResponseCode === 'success' || data.ResponseCode === '0000') {
      return { success: true, data: data.Data };
    } else {
      return { 
        success: false, 
        error: data.Data?.Description || 'Status check failed' 
      };
    }
  } catch (error: any) {
    console.error('Hubtel status check error:', error);
    return { success: false, error: error.message };
  }
}
