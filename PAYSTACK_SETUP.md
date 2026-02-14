# Paystack Mobile Money Integration Setup

This document explains how to set up Paystack for mobile money voting payments.

## Prerequisites

1. A Paystack account (sign up at https://paystack.com)
2. Verified business details on Paystack
3. Mobile Money enabled on your Paystack account

## Setup Steps

### 1. Get Your Paystack API Keys

1. Log in to your Paystack Dashboard
2. Go to Settings > API Keys & Webhooks
3. Copy your **Public Key** and **Secret Key**
4. For testing, use the test keys (starts with `pk_test_` and `sk_test_`)
5. For production, use live keys (starts with `pk_live_` and `sk_live_`)

### 2. Configure Environment Variables

Add the following to your `.env.local` file:

```env
# Paystack Configuration
PAYSTACK_SECRET_KEY=sk_test_your_secret_key_here
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_your_public_key_here
```

**Important:** 
- The `PAYSTACK_SECRET_KEY` is used on the server side and should NEVER be exposed to the client
- The `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` is safe to use on the client side

### 3. Enable Mobile Money on Paystack

1. Go to your Paystack Dashboard
2. Navigate to Settings > Payment Channels
3. Enable **Mobile Money**
4. Select the mobile money providers you want to support:
   - MTN Mobile Money
   - Vodafone Cash
   - AirtelTigo Money

### 4. Test the Integration

#### Test Mode
In test mode, you can use these test numbers:

**MTN Mobile Money:**
- Number: `0241234567`
- OTP: `123456`

**Vodafone Cash:**
- Number: `0501234567`
- OTP: `123456`

#### Testing Flow:
1. Go to `/find-vote`
2. Select an award and category
3. Click on a nominee to vote
4. Fill in your email and phone number
5. Select number of votes
6. Click "Pay with Mobile Money"
7. Complete the payment on the Paystack popup
8. Verify the vote count increases

### 5. Go Live

When ready for production:

1. Complete Paystack business verification
2. Replace test keys with live keys in `.env.local`
3. Test with real mobile money accounts
4. Monitor transactions in Paystack Dashboard

## Features Implemented

### Voting Modal
- Nominee information display
- Vote count selection (quick select or custom)
- Price calculation
- Email and phone validation
- Mobile money payment via Paystack

### Payment Flow
1. **Initialize Payment** - Creates pending vote record
2. **Paystack Popup** - User completes mobile money payment
3. **Verify Payment** - Confirms payment with Paystack API
4. **Record Vote** - Updates vote counts in database

### Database Models

**PendingVote** - Tracks votes before payment confirmation
- Stores vote details temporarily
- Links payment reference to vote data

**Vote** - Records completed votes
- Permanent vote record
- Includes payment information
- Tracks voter details

### Security Features
- Payment verification with Paystack API
- Duplicate payment prevention
- Secure reference generation
- Server-side validation

## API Endpoints

### POST `/api/public/votes/initialize`
Initializes a vote and creates payment reference

**Request:**
```json
{
  "awardId": "award_id",
  "categoryId": "category_id",
  "nomineeId": "nominee_id",
  "email": "voter@email.com",
  "phone": "0241234567",
  "numberOfVotes": 5,
  "amount": 2.50
}
```

**Response:**
```json
{
  "success": true,
  "reference": "VOTE_1234567890_abcd1234",
  "message": "Payment initialized successfully"
}
```

### POST `/api/public/votes/verify`
Verifies payment and records vote

**Request:**
```json
{
  "reference": "VOTE_1234567890_abcd1234"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Vote recorded successfully",
  "votes": 5
}
```

## Troubleshooting

### Payment Not Processing
- Check that Paystack keys are correctly set in `.env.local`
- Verify mobile money is enabled in Paystack Dashboard
- Check browser console for errors
- Ensure Paystack script is loaded (check Network tab)

### Vote Count Not Updating
- Check MongoDB connection
- Verify payment was successful in Paystack Dashboard
- Check server logs for errors
- Ensure nominee, category, and award IDs are valid

### Mobile Money Popup Not Showing
- Ensure `channels: ['mobile_money']` is set in Paystack config
- Check that Paystack script loaded successfully
- Try refreshing the page
- Clear browser cache

## Support

For Paystack-specific issues:
- Documentation: https://paystack.com/docs
- Support: support@paystack.com

For integration issues:
- Check server logs
- Review API responses
- Test with Paystack test mode first
