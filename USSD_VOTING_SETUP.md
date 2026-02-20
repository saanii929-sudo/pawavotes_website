# USSD Voting Integration Guide

## Overview
This guide explains how to set up USSD voting with Arkesel USSD (Ghana) and Paystack payment integration.

## Features
- Vote via USSD shortcode (e.g., *920*123#)
- Interactive menu navigation
- Select award, category, and nominee
- Specify number of votes
- Mobile Money payment via Paystack
- SMS confirmation from Paystack (automatic)

## Architecture

### Flow
1. User dials USSD code (e.g., *920*123#)
2. Arkesel USSD sends webhook to your server
3. Server responds with menu options
4. User navigates through:
   - Select Award
   - Select Category
   - Select Nominee (by code or browse)
   - Enter number of votes
   - Confirm payment
5. Paystack initiates mobile money charge
6. User approves payment on phone
7. Webhook updates vote status

### Components

#### 1. UssdSession Model (`models/UssdSession.ts`)
Tracks user sessions with:
- Session ID
- Phone number
- Current step in flow
- Selected data (award, category, nominee, etc.)
- Auto-expires after 5 minutes

#### 2. USSD Webhook (`app/api/ussd/vote/route.ts`)
Handles Arkesel USSD requests:
- Manages session state
- Generates dynamic menus
- Validates user input
- Initiates Paystack payments

#### 3. Paystack Integration
Uses Paystack Mobile Money API to charge users directly from their mobile money accounts.

## Setup Instructions

### 1. Arkesel USSD Configuration

1. **Register with Arkesel**
   - Visit: https://sms.arkesel.com
   - Sign up for USSD service
   - Request a shortcode (e.g., *920*123#)

2. **Configure Webhook URL**
   - Set webhook URL to: `https://yourdomain.com/api/ussd/vote`
   - Method: POST
   - Content-Type: application/json

3. **Arkesel Request Format**
   ```json
   {
     "sessionID": "unique-session-id",
     "userID": "CP9VG7Y5TN_dNri2",
     "newSession": true,
     "msisdn": "233241234567",
     "userData": "1*2*3",
     "network": "MTN"
   }
   ```

4. **Response Format**
   - `continueSession: true` = Continue (show menu)
   - `continueSession: false` = End session (final message)
   
   Example:
   ```json
   {
     "sessionID": "unique-session-id",
     "userID": "CP9VG7Y5TN_dNri2",
     "msisdn": "233241234567",
     "message": "Welcome to PawaVotes!\n1. Award 1\n2. Award 2",
     "continueSession": true
   }
   ```

### 2. Paystack Mobile Money Setup

1. **Enable Mobile Money**
   - Log into Paystack Dashboard
   - Go to Settings > Payment Methods
   - Enable Mobile Money (Ghana)
   - Supported providers: MTN, Vodafone, AirtelTigo

2. **Test Mode**
   - Use test secret key for development
   - Test phone numbers: Use your actual number
   - Test amounts: Use small amounts (GHS 1)

3. **Live Mode**
   - Complete KYC verification
   - Switch to live secret key
   - Test thoroughly before launch

### 3. Environment Variables

Add to `.env.local`:
```env
# Paystack (already configured)
PAYSTACK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxx

# Arkesel USSD
ARKESEL_USSD_USER_ID=CP9VG7Y5TN_dNri2
ARKESEL_USSD_ENDPOINT=https://sms.arkesel.com/ussd-endpoint-url

# Arkesel SMS (for balance checking)
ARKESEL_API_KEY=ZEFGc0FndExNUnRvTklFTVByQmI
```

### 4. Webhook Security (Optional)

Add webhook verification to `app/api/ussd/vote/route.ts`:

```typescript
// Verify Arkesel webhook by checking userID
const { userID } = body;
const expectedUserID = process.env.ARKESEL_USSD_USER_ID;

if (userID !== expectedUserID) {
  return NextResponse.json({
    sessionID: '',
    userID: expectedUserID,
    msisdn: '',
    message: 'Unauthorized request',
    continueSession: false,
  }, { status: 401 });
}
```

## USSD Flow Example

```
User dials: *920*123#

Step 1 - Welcome:
CON Welcome to PawaVotes!
Select an award to vote:

1. Ghana Music Awards 2025
2. Student Excellence Awards

User enters: 1

Step 2 - Category:
CON Ghana Music Awards 2025
Select a category:

1. Best Artist
2. Best Song
3. Best New Artist

User enters: 2

Step 3 - Nominee Method:
CON Best Song

How would you like to vote?

1. Enter Nominee Code
2. Browse Nominees

User enters: 1

Step 4 - Nominee Code:
CON Enter the Nominee Code
(e.g., GMA001):

User enters: GMA001

Step 5 - Vote Quantity:
CON Voting for: John Doe - "Amazing" (GMA001)

GHS 0.50 per vote

Enter number of votes (1-100):

User enters: 10

Step 6 - Confirmation:
CON Confirm your vote:

Nominee: John Doe - "Amazing" (GMA001)
Votes: 10
Amount: GHS 5.00

1. Confirm & Pay
2. Cancel

User enters: 1

Step 7 - Payment:
END Vote submitted!

Approve the payment prompt on your phone (233241234567) to complete.

You will receive SMS confirmation from Paystack.
```

## Testing

### 1. Local Testing with ngrok

```bash
# Install ngrok
npm install -g ngrok

# Start your dev server
npm run dev

# In another terminal, expose your local server
ngrok http 3000

# Use the ngrok URL for Arkesel webhook
# Example: https://abc123.ngrok.io/api/ussd/vote
```

### 2. Test USSD Flow

You can simulate USSD requests using curl:

```bash
curl -X POST http://localhost:3000/api/ussd/vote \
  -H "Content-Type: application/json" \
  -d '{
    "sessionID": "test-session-123",
    "userID": "CP9VG7Y5TN_dNri2",
    "newSession": true,
    "msisdn": "233241234567",
    "userData": "",
    "network": "MTN"
  }'
```

### 3. Test Paystack Payment

```bash
# Test mobile money charge
curl -X POST https://api.paystack.co/charge \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "amount": 500,
    "mobile_money": {
      "phone": "233241234567",
      "provider": "mtn"
    },
    "reference": "test-ref-123",
    "currency": "GHS"
  }'
```

## Mobile Money Providers

### Ghana Networks (Auto-detected)
The system automatically detects the mobile network provider based on the phone number prefix:

- **MTN**: Prefixes 024, 025, 053, 054, 055, 059 → `provider: "mtn"`
- **Vodafone**: Prefixes 020, 050 → `provider: "vod"`
- **AirtelTigo**: Prefixes 026, 027, 056, 057 → `provider: "tgo"`

The detection works with both local (0XXXXXXXXX) and international (233XXXXXXXXX) formats.

## Monitoring & Logs

Check your server logs for:
- `📱 USSD Request:` - Incoming USSD requests
- `📤 USSD Response:` - Outgoing menu responses
- `Paystack charge response:` - Payment initiation results

## Troubleshooting

### Issue: Session expires too quickly
**Solution**: Increase session timeout in `models/UssdSession.ts`:
```typescript
UssdSessionSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 600 }); // 10 minutes
```

### Issue: Payment fails
**Possible causes**:
- Insufficient balance
- Wrong network provider
- Paystack not enabled for mobile money
- Test mode limitations

**Solution**: Check Paystack dashboard logs and ensure mobile money is enabled.

### Issue: USSD menu not showing
**Possible causes**:
- Webhook URL not configured correctly
- Server not accessible (firewall/ngrok)
- Response format incorrect (must include continueSession boolean)

**Solution**: Check Arkesel dashboard webhook logs and verify server is accessible.

## Production Checklist

- [ ] Register production USSD shortcode with Arkesel
- [ ] Complete Paystack KYC verification
- [ ] Switch to live Paystack keys
- [ ] Set up webhook userID verification
- [ ] Configure production webhook URL (HTTPS required)
- [ ] Test with real mobile money accounts
- [ ] Set up monitoring and alerts
- [ ] Add rate limiting to prevent abuse
- [ ] Document shortcode for users
- [ ] Train support team on USSD flow

## Support

- **Arkesel USSD**: support@arkesel.com
- **Paystack**: support@paystack.com
- **Documentation**: 
  - Arkesel: https://developers.arkesel.com
  - Paystack: https://paystack.com/docs/payments/mobile-money

## Cost Considerations

### Arkesel USSD Pricing
- Setup fee: Contact Arkesel
- Per-session fee: ~GHS 0.02 - 0.05
- Monthly maintenance: Contact Arkesel

### Paystack Fees
- Mobile Money: 1.95% + GHS 0.00 (capped at GHS 10)
- Example: GHS 5.00 vote = GHS 0.10 fee

## Next Steps

1. Contact Arkesel to register for USSD service
2. Test the integration locally with ngrok
3. Deploy to production server (HTTPS required)
4. Configure Arkesel webhook with production URL
5. Test with real mobile money transactions
6. Launch and monitor

## Migration from Nalo to Arkesel

If you're migrating from Nalo USSD, see `ARKESEL_USSD_INTEGRATION.md` for detailed comparison and migration guide.
