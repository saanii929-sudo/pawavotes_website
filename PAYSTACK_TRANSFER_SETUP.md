# Paystack Transfer Setup Guide

## Overview
The transfer system is now integrated with Paystack. When organizers request transfers, the system automatically:
1. Calculates total revenue from the award
2. Deducts 10% platform fee
3. Initiates transfer via Paystack API
4. Updates status via webhook when transfer completes

## Initial Setup Required

### 1. Disable OTP for Transfers (Recommended)

By default, Paystack requires OTP verification for every transfer. To enable automated transfers:

1. **Log in to your Paystack Dashboard**: https://dashboard.paystack.com
2. **Go to Settings** → **Preferences**
3. **Find "Transfer Settings"** section
4. **Disable "Require OTP for transfers"**
5. **Save changes**

**Note**: You may need to verify your business and complete KYC before this option is available.

### 2. Alternative: Finalize Transfers Manually

If you prefer to keep OTP enabled for security:

1. When a transfer is initiated, you'll receive an SMS with a PIN
2. Go to Paystack Dashboard → Transfers
3. Find the pending transfer
4. Click "Finalize" and enter the PIN from SMS
5. The webhook will automatically update the status in your system

### 3. Set Up Webhook (Required)

To automatically update transfer status:

1. **Go to Paystack Dashboard** → **Settings** → **Webhooks**
2. **Add webhook URL**: `https://yourdomain.com/api/webhooks/paystack`
3. **Select events to listen for**:
   - `transfer.success`
   - `transfer.failed`
   - `transfer.reversed`
4. **Save webhook**

**For local development**:
- Use ngrok or similar tool to expose your local server
- Example: `ngrok http 3000`
- Use the ngrok URL: `https://abc123.ngrok.io/api/webhooks/paystack`

### 4. Test the Integration

1. Create a test transfer with a small amount
2. Check the transfer status in your dashboard
3. Verify the webhook is receiving events (check server logs)
4. Confirm status updates automatically

## How It Works

### Transfer Flow

1. **Organizer initiates transfer**:
   - Selects award
   - Views revenue breakdown (Total, Platform Fee, Available)
   - Enters recipient details (bank or mobile money)
   - Clicks "Request Transfer"

2. **System processes**:
   - Validates available funds
   - Creates/retrieves Paystack recipient
   - Initiates transfer via Paystack API
   - Saves transfer record with status "pending"

3. **Paystack processes**:
   - If OTP disabled: Transfer processes automatically
   - If OTP enabled: Sends SMS, waits for manual finalization
   - Sends webhook event when complete

4. **System updates**:
   - Webhook receives event
   - Updates transfer status to "successful" or "failed"
   - Organizer sees updated status in dashboard

### Revenue Calculation

```
Total Revenue = Voting Revenue + Nomination Revenue
Platform Fee = Total Revenue × 10%
Transferable Amount = Total Revenue - Platform Fee
Available Amount = Transferable Amount - Already Transferred
```

### Bank Codes (Ghana)

The system maps bank names to Paystack bank codes:
- GCB Bank: `040`
- Ecobank: `130`
- Stanbic Bank: `190`
- Absa Bank: `030`
- Fidelity Bank: `240`

### Mobile Money Networks

Supported networks:
- MTN Mobile Money: `MTN`
- Vodafone Cash: `VOD`
- AirtelTigo Money: `ATL`

## Troubleshooting

### Transfer stays "pending"

**Possible causes**:
1. OTP not finalized (if OTP is enabled)
2. Insufficient balance in Paystack account
3. Webhook not configured
4. Invalid recipient details

**Solutions**:
- Check Paystack dashboard for transfer status
- Verify webhook is receiving events (check logs)
- Ensure Paystack account has sufficient balance
- Disable OTP for automated processing

### "Failed to create transfer recipient"

**Possible causes**:
1. Invalid bank code
2. Invalid account number
3. Invalid phone number format

**Solutions**:
- Verify recipient details are correct
- Check bank code mapping in code
- Ensure phone numbers are in correct format (e.g., 0241234567)

### Webhook not receiving events

**Possible causes**:
1. Webhook URL not configured in Paystack
2. Incorrect webhook URL
3. Firewall blocking Paystack IPs

**Solutions**:
- Verify webhook URL in Paystack dashboard
- Check server logs for incoming requests
- Ensure server is publicly accessible
- For local dev, use ngrok

## Security Notes

1. **Never commit** your Paystack secret key to version control
2. **Always verify** webhook signatures to prevent spoofing
3. **Use HTTPS** in production for webhook endpoint
4. **Monitor transfers** regularly for suspicious activity
5. **Keep OTP enabled** if you prefer manual approval for each transfer

## API Endpoints

### Get Revenue Info
```
GET /api/transfers/revenue?awardId={awardId}
Authorization: Bearer {token}
```

### Request Transfer
```
POST /api/transfers
Authorization: Bearer {token}
Content-Type: application/json

{
  "awardId": "string",
  "recipientName": "string",
  "transferType": "bank" | "mobile_money",
  "recipientBank": "string", // for bank transfers
  "recipientAccountNumber": "string", // for bank transfers
  "recipientPhoneNumber": "string" // for mobile money
}
```

### Get Transfers
```
GET /api/transfers?awardId={awardId}
```

### Webhook Endpoint
```
POST /api/webhooks/paystack
X-Paystack-Signature: {signature}
```

## Support

For Paystack-specific issues:
- Paystack Documentation: https://paystack.com/docs/transfers/single-transfers
- Paystack Support: support@paystack.com

For system issues:
- Check server logs for detailed error messages
- Verify all environment variables are set correctly
- Ensure MongoDB connection is working
