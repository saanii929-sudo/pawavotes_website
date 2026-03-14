import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Transfer from '@/models/Transfer';
import { verifyToken } from '@/lib/auth';

export async function POST(
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
    if (!decoded || decoded.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only super admins can approve transfers' },
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

    if (transfer.status !== 'pending') {
      return NextResponse.json(
        { error: `Transfer is already ${transfer.status}` },
        { status: 400 }
      );
    }
    transfer.status = 'approved';
    transfer.approvedBy = decoded.email || decoded.id;
    transfer.approvedAt = new Date();
    await transfer.save();

     console.log('Transfer approved, initiating Hubtel Send Money:', {
      transferId,
      referenceId: transfer.referenceId,
      amount: transfer.amount,
      approvedBy: decoded.email,
    });
    if (transfer.transferType === 'mobile_money') {
      try {
        const hubtelResponse = await initiateHubtelSendMoney(transfer);

        if (hubtelResponse.success) {
          transfer.status = 'completed';
          transfer.hubtelData = hubtelResponse.data;
          await transfer.save();

          console.log('Hubtel Send Money initiated successfully:', {
            transferId,
            transactionId: hubtelResponse.data?.TransactionId,
          });
          setTimeout(async () => {
            try {
              const updatedTransfer = await Transfer.findById(transferId);
              if (updatedTransfer && updatedTransfer.status === 'completed') {
                 // console.log(`[${transfer.referenceId}] No callback received after 5 minutes, checking status`);
                
                const statusResponse = await checkTransferStatus(transfer.referenceId);
                
                if (statusResponse.success && statusResponse.data) {
                  const statusData = statusResponse.data;
                  
                  if (statusData.transactionStatus === 'success') {
                    updatedTransfer.status = 'completed';
                    updatedTransfer.hubtelData = {
                      ...updatedTransfer.hubtelData,
                      statusCheck: statusData,
                    };
                    updatedTransfer.notes = `${updatedTransfer.notes || ''}\nCompleted via status check (callback not received)`.trim();
                    await updatedTransfer.save();
                     // console.log(`[${transfer.referenceId}] Transfer completed via status check`);
                  } else if (statusData.transactionStatus === 'failed') {
                    updatedTransfer.status = 'failed';
                    updatedTransfer.hubtelData = {
                      ...updatedTransfer.hubtelData,
                      statusCheck: statusData,
                    };
                    updatedTransfer.notes = `${updatedTransfer.notes || ''}\nFailed (verified via status check)`.trim();
                    await updatedTransfer.save();
                     // console.log(`[${transfer.referenceId}] Transfer failed (verified via status check)`);
                  } else {
                     // console.log(`[${transfer.referenceId}] Transfer still pending after status check`);
                  }
                }
              }
            } catch (statusError) {
              console.error(`[${transfer.referenceId}] Error in scheduled status check:`, statusError);
            }
          }, 5 * 60 * 1000); // 5 minutes

          return NextResponse.json({
            success: true,
            message: 'Transfer approved and initiated successfully. Awaiting Hubtel callback.',
            data: transfer,
          });
        } else {
          transfer.status = 'failed';
          transfer.notes = `Hubtel API Error: ${hubtelResponse.error}`;
          await transfer.save();

          return NextResponse.json({
            success: false,
            error: 'Failed to initiate transfer with Hubtel',
            details: hubtelResponse.error,
            data: transfer,
          }, { status: 500 });
        }
      } catch (error: any) {
        transfer.status = 'failed';
        transfer.notes = `Error: ${error.message}`;
        await transfer.save();

        return NextResponse.json({
          success: false,
          error: 'Failed to process transfer',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
          data: transfer,
        }, { status: 500 });
      }
    } else if (transfer.transferType === 'bank') {
      try {
        const hubtelResponse = await initiateHubtelSendToBank(transfer);

        if (hubtelResponse.success) {
          transfer.status = 'completed';
          transfer.hubtelData = hubtelResponse.data;
          await transfer.save();

           console.log('Hubtel Send-To-Bank initiated successfully:', {
            transferId,
            transactionId: hubtelResponse.data?.TransactionId,
          });
          setTimeout(async () => {
            try {
              const updatedTransfer = await Transfer.findById(transferId);
              
              if (updatedTransfer && updatedTransfer.status === 'completed') {
                // console.log(`[${transfer.referenceId}] No callback received after 5 minutes, checking status`);
                
                const statusResponse = await checkTransferStatus(transfer.referenceId);
                
                if (statusResponse.success && statusResponse.data) {
                  const statusData = statusResponse.data;
                  
                  if (statusData.transactionStatus === 'success') {
                    updatedTransfer.status = 'completed';
                    updatedTransfer.hubtelData = {
                      ...updatedTransfer.hubtelData,
                      statusCheck: statusData,
                    };
                    updatedTransfer.notes = `${updatedTransfer.notes || ''}\nCompleted via status check (callback not received)`.trim();
                    await updatedTransfer.save();
                     // console.log(`[${transfer.referenceId}] Bank transfer completed via status check`);
                  } else if (statusData.transactionStatus === 'failed') {
                    updatedTransfer.status = 'failed';
                    updatedTransfer.hubtelData = {
                      ...updatedTransfer.hubtelData,
                      statusCheck: statusData,
                    };
                    updatedTransfer.notes = `${updatedTransfer.notes || ''}\nFailed (verified via status check)`.trim();
                    await updatedTransfer.save();
                     // console.log(`[${transfer.referenceId}] Bank transfer failed (verified via status check)`);
                  }
                }
              }
            } catch (statusError) {
              console.error(`[${transfer.referenceId}] Error in scheduled status check:`, statusError);
            }
          }, 5 * 60 * 1000);

          return NextResponse.json({
            success: true,
            message: 'Bank transfer approved and initiated successfully. Awaiting Hubtel callback.',
            data: transfer,
          });
        } else {
          transfer.status = 'failed';
          transfer.notes = `Hubtel API Error: ${hubtelResponse.error}`;
          await transfer.save();

          return NextResponse.json({
            success: false,
            error: 'Failed to initiate bank transfer with Hubtel',
            details: hubtelResponse.error,
            data: transfer,
          }, { status: 500 });
        }
      } catch (error: any) {
        transfer.status = 'failed';
        transfer.notes = `Error: ${error.message}`;
        await transfer.save();

        return NextResponse.json({
          success: false,
          error: 'Failed to process bank transfer',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
          data: transfer,
        }, { status: 500 });
      }
    } else {
      return NextResponse.json({
        success: false,
        message: 'Unknown transfer type',
        data: transfer,
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Transfer approval error:', error);
    return NextResponse.json(
      { error: 'Failed to approve transfer', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

const BANK_CODES: { [key: string]: string } = {
  'STANDARD CHARTERED BANK': '300302',
  'ABSA BANK': '300303',
  'ABSA': '300303',
  'GCB BANK': '300304',
  'GCB': '300304',
  'NATIONAL INVESTMENT BANK': '300305',
  'NIB': '300305',
  'ARB APEX BANK': '300306',
  'AGRICULTURAL DEVELOPMENT BANK': '300307',
  'ADB': '300307',
  'UNIVERSAL MERCHANT BANK': '300309',
  'UMB': '300309',
  'REPUBLIC BANK': '300310',
  'ZENITH BANK': '300311',
  'ECOBANK': '300312',
  'CAL BANK': '300313',
  'FIRST ATLANTIC BANK': '300316',
  'PRUDENTIAL BANK': '300317',
  'STANBIC BANK': '300318',
  'STANBIC': '300318',
  'FIRST BANK OF NIGERIA': '300319',
  'BANK OF AFRICA': '300320',
  'GUARANTY TRUST BANK': '300322',
  'GTB': '300322',
  'FIDELITY BANK': '300323',
  'SAHEL SAHARA BANK': '300324',
  'BSIC': '300324',
  'UNITED BANK OF AFRICA': '300325',
  'UBA': '300325',
  'ACCESS BANK': '300329',
  'CONSOLIDATED BANK': '300331',
  'FIRST NATIONAL BANK': '300334',
  'FNB': '300334',
  'GHL BANK': '300362',
};

function getBankCode(bankName: string): string | null {
  const normalized = bankName.toUpperCase().trim();
  return BANK_CODES[normalized] || null;
}

async function initiateHubtelSendMoney(transfer: any) {
  try {
    const hubtelApiId = process.env.HUBTEL_API_ID;
    const hubtelApiKey = process.env.HUBTEL_API_KEY;
    const hubtelPrepaidDepositId = process.env.HUBTEL_PREPAID_DEPOSIT_ID;
    const callbackUrl = process.env.HUBTEL_CALLBACK_URL || `${process.env.NEXT_PUBLIC_API_URL}/api/webhooks/hubtel/transfer`;

    if (!hubtelApiId || !hubtelApiKey || !hubtelPrepaidDepositId) {
      console.error('Hubtel credentials not configured');
      return { success: false, error: 'Hubtel credentials not configured' };
    }
    let formattedPhone = transfer.recipientPhoneNumber.replace(/[\s\-+]/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '233' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('233')) {
      formattedPhone = '233' + formattedPhone;
    }

    let channel = 'mtn-gh'; // default
    if (transfer.notes && transfer.notes.includes('Network:')) {
      const network = transfer.notes.split('Network:')[1].trim().toLowerCase();
      const channelMap: { [key: string]: string } = {
        'mtn': 'mtn-gh',
        'telecel': 'vodafone-gh',
        'vodafone': 'vodafone-gh',
        'airteltigo': 'tigo-gh',
        'tigo': 'tigo-gh',
      };
      channel = channelMap[network] || 'mtn-gh';
    }

     console.log('Hubtel Send Money request:', {
      recipientName: transfer.recipientName,
      recipientPhone: formattedPhone,
      channel,
      amount: transfer.amount,
      reference: transfer.referenceId,
    });

    const hubtelRequest = {
      RecipientName: transfer.recipientName,
      RecipientMsisdn: formattedPhone,
      CustomerEmail: transfer.initiatedBy,
      Channel: channel,
      Amount: transfer.amount,
      PrimaryCallbackURL: callbackUrl,
      Description: `Transfer for award - ${transfer.referenceId}`,
      ClientReference: transfer.referenceId,
    };

    const authString = `${hubtelApiId}:${hubtelApiKey}`;
    const base64Auth = Buffer.from(authString).toString('base64');

    const response = await fetch(
      `https://smp.hubtel.com/api/merchants/${hubtelPrepaidDepositId}/send/mobilemoney`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${base64Auth}`,
        },
        body: JSON.stringify(hubtelRequest),
      }
    );

    const responseText = await response.text();
    // console.log('Hubtel Send Money raw response:', responseText);
    if (responseText.trim().startsWith('<')) {
      console.error('Hubtel returned HTML (likely 403 Forbidden - IP not whitelisted)');
      return { 
        success: false, 
        error: 'Access denied by Hubtel. Your IP address may not be whitelisted. Please contact Hubtel support to whitelist your server IP.',
        statusCode: response.status
      };
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Hubtel response:', parseError);
      return { 
        success: false, 
        error: `Invalid response from Hubtel (Status: ${response.status}). Response: ${responseText.substring(0, 200)}` 
      };
    }

     // console.log('Hubtel Send Money parsed response:', data);

    if (!response.ok) {
      return { 
        success: false, 
        error: data.Data?.Description || data.message || 'Hubtel API error',
        data 
      };
    }
    if (data.ResponseCode === '0001' || data.ResponseCode === '0000') {
      return { success: true, data: data.Data };
    } else {
      return { 
        success: false, 
        error: data.Data?.Description || 'Transfer failed',
        data 
      };
    }
  } catch (error: any) {
    console.error('Hubtel Send Money error:', error);
    return { success: false, error: error.message };
  }
}
async function initiateHubtelSendToBank(transfer: any) {
  try {
    const hubtelApiId = process.env.HUBTEL_API_ID;
    const hubtelApiKey = process.env.HUBTEL_API_KEY;
    const hubtelPrepaidDepositId = process.env.HUBTEL_PREPAID_DEPOSIT_ID;
    const callbackUrl = process.env.HUBTEL_TRANSFER_CALLBACK_URL || `${process.env.NEXT_PUBLIC_API_URL}/api/webhooks/hubtel/transfer`;

    if (!hubtelApiId || !hubtelApiKey || !hubtelPrepaidDepositId) {
      console.error('Hubtel credentials not configured');
      return { success: false, error: 'Hubtel credentials not configured' };
    }

    if (!transfer.recipientBank || !transfer.recipientAccountNumber) {
      return { success: false, error: 'Bank name and account number are required' };
    }
    const bankCode = getBankCode(transfer.recipientBank);
    if (!bankCode) {
      return { 
        success: false, 
        error: `Bank not supported: ${transfer.recipientBank}. Please check bank name.` 
      };
    }

   console.log('Hubtel Send-To-Bank request:', {
      recipientName: transfer.recipientName,
      bankName: transfer.recipientBank,
      bankCode,
      accountNumber: transfer.recipientAccountNumber,
      amount: transfer.amount,
      reference: transfer.referenceId,
    });

    const hubtelRequest = {
      Amount: transfer.amount,
      BankAccountNumber: transfer.recipientAccountNumber,
      BankAccountName: transfer.recipientName,
      BankName: transfer.recipientBank,
      BankBranch: '',
      BankBranchCode: '',
      RecipientPhoneNumber: transfer.recipientPhoneNumber || '',
      PrimaryCallbackUrl: callbackUrl,
      Description: `Bank transfer for award - ${transfer.referenceId}`,
      ClientReference: transfer.referenceId,
    };

    const authString = `${hubtelApiId}:${hubtelApiKey}`;
    const base64Auth = Buffer.from(authString).toString('base64');

    const response = await fetch(
      `https://smp.hubtel.com/api/merchants/${hubtelPrepaidDepositId}/send/bank/gh/${bankCode}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${base64Auth}`,
        },
        body: JSON.stringify(hubtelRequest),
      }
    );

    const responseText = await response.text();
     // console.log('Hubtel Send-To-Bank raw response:', responseText);
    if (responseText.trim().startsWith('<')) {
      console.error('Hubtel returned HTML (likely 403 Forbidden - IP not whitelisted)');
      return { 
        success: false, 
        error: 'Access denied by Hubtel. Your IP address may not be whitelisted. Please contact Hubtel support to whitelist your server IP.',
        statusCode: response.status
      };
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Hubtel response:', parseError);
      return { 
        success: false, 
        error: `Invalid response from Hubtel (Status: ${response.status}). Response: ${responseText.substring(0, 200)}` 
      };
    }

     // console.log('Hubtel Send-To-Bank parsed response:', data);

    if (!response.ok) {
      return { 
        success: false, 
        error: data.Data?.Description || data.message || 'Hubtel API error',
        data 
      };
    }
    if (data.ResponseCode === '0001' || data.ResponseCode === '0000') {
      return { success: true, data: data.Data };
    } else {
      return { 
        success: false, 
        error: data.Data?.Description || 'Bank transfer failed',
        data 
      };
    }
  } catch (error: any) {
    console.error('Hubtel Send-To-Bank error:', error);
    return { success: false, error: error.message };
  }
}

async function checkTransferStatus(clientReference: string) {
  try {
    const hubtelApiId = process.env.HUBTEL_API_ID;
    const hubtelApiKey = process.env.HUBTEL_API_KEY;
    const hubtelPrepaidDepositId = process.env.HUBTEL_PREPAID_DEPOSIT_ID;

    if (!hubtelApiId || !hubtelApiKey || !hubtelPrepaidDepositId) {
      return { success: false, error: 'Hubtel credentials not configured' };
    }

    const authString = `${hubtelApiId}:${hubtelApiKey}`;
    const base64Auth = Buffer.from(authString).toString('base64');

    const url = `https://smrsc.hubtel.com/api/merchants/${hubtelPrepaidDepositId}/transactions/status?clientReference=${clientReference}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${base64Auth}`,
      },
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();

    if (data.ResponseCode === 'success' || data.ResponseCode === '0000') {
      return { success: true, data: data.Data };
    } else {
      return { success: false, error: 'Status check failed' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
