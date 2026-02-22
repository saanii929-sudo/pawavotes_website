# USSD Voting Testing Guide

## Overview
USSD voting requires integration with Arkesel's USSD service and your mobile network operator. You cannot test USSD by simply dialing a code without proper setup.

## Prerequisites

### 1. Arkesel USSD Setup
- **USSD Code:** You need to purchase/register a USSD code (e.g., `*928*121#`) from Arkesel
- **Webhook URL:** Your production URL must be registered with Arkesel
- **User ID:** `CP9VG7Y5TN_dNri2` (already configured in code)

### 2. Production Deployment
USSD **CANNOT** work on localhost. You need:
- A publicly accessible URL (e.g., `https://pawavotes.com`)
- SSL certificate (HTTPS required)
- Deployed on a server (Coolify, Vercel, etc.)

### 3. Arkesel Configuration
In your Arkesel dashboard:
1. Go to USSD section
2. Register your USSD code
3. Set webhook URL: `https://yourdomain.com/api/ussd/vote`
4. Set HTTP method: `POST`
5. Enable the USSD service

## Testing Methods

### Method 1: Test with Postman/cURL (Recommended for Development)

You can simulate USSD requests locally:

```bash
# Test welcome screen
curl -X POST http://localhost:3000/api/ussd/vote \
  -H "Content-Type: application/json" \
  -d '{
    "sessionID": "test-session-123",
    "userID": "CP9VG7Y5TN_dNri2",
    "newSession": true,
    "msisdn": "233551234567",
    "userData": "",
    "network": "MTN"
  }'
```

Expected response:
```json
{
  "sessionID": "test-session-123",
  "userID": "CP9VG7Y5TN_dNri2",
  "msisdn": "233551234567",
  "message": "Welcome to PawaVotes!\nSelect an award to vote:\n\n1. Award Name",
  "continueSession": true
}
```

### Method 2: Test Award Selection

```bash
# Select award (option 1)
curl -X POST http://localhost:3000/api/ussd/vote \
  -H "Content-Type: application/json" \
  -d '{
    "sessionID": "test-session-123",
    "userID": "CP9VG7Y5TN_dNri2",
    "newSession": false,
    "msisdn": "233551234567",
    "userData": "1",
    "network": "MTN"
  }'
```

### Method 3: Complete Flow Test

```javascript
// test-ussd.js
const testUSSD = async () => {
  const sessionID = `test-${Date.now()}`;
  const msisdn = '233551234567';
  const baseURL = 'http://localhost:3000/api/ussd/vote';

  // Step 1: Welcome
  console.log('\n=== Step 1: Welcome ===');
  let response = await fetch(baseURL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionID,
      userID: 'CP9VG7Y5TN_dNri2',
      newSession: true,
      msisdn,
      userData: '',
      network: 'MTN'
    })
  });
  let data = await response.json();
  console.log(data.message);

  // Step 2: Select Award (1)
  console.log('\n=== Step 2: Select Award ===');
  response = await fetch(baseURL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionID,
      userID: 'CP9VG7Y5TN_dNri2',
      newSession: false,
      msisdn,
      userData: '1',
      network: 'MTN'
    })
  });
  data = await response.json();
  console.log(data.message);

  // Continue with more steps...
};

testUSSD();
```

Run with: `node test-ussd.js`

## Why USSD Code Doesn't Work Locally

### The Problem:
When you dial `*928*121#` on your phone:
1. Your phone sends the request to your mobile network (MTN, Vodafone, etc.)
2. The network routes it to Arkesel's USSD gateway
3. Arkesel forwards it to your registered webhook URL
4. **Your localhost is not accessible from the internet**

### The Solution:
You need a publicly accessible URL. Options:

#### Option A: Deploy to Production
```bash
# Deploy to your server
git push origin main
# Arkesel will call: https://pawavotes.com/api/ussd/vote
```

#### Option B: Use ngrok for Testing
```bash
# Install ngrok
npm install -g ngrok

# Start your Next.js app
pnpm dev

# In another terminal, expose it
ngrok http 3000

# You'll get a URL like: https://abc123.ngrok.io
# Register this in Arkesel: https://abc123.ngrok.io/api/ussd/vote
```

**Note:** ngrok URLs change on restart (use paid version for persistent URLs)

## Arkesel Dashboard Setup

### 1. Login to Arkesel
- URL: https://sms.arkesel.com
- Use your account credentials

### 2. Navigate to USSD Section
- Click on "USSD" in the sidebar
- Click "Create New USSD Service"

### 3. Configure USSD Service
```
USSD Code: *928*121#
Service Name: PawaVotes
Webhook URL: https://yourdomain.com/api/ussd/vote
HTTP Method: POST
Content Type: application/json
```

### 4. Test Configuration
- Arkesel provides a test interface
- You can simulate USSD requests from their dashboard
- Check webhook logs to see if requests are reaching your server

## Checking Logs

### Server Logs
Check your server logs for USSD requests:
```bash
# If using PM2
pm2 logs

# If using Docker
docker logs container-name

# Check for lines starting with "USSD:"
```

### Expected Log Output
```
USSD: Fetching published awards...
USSD: Found 1 published awards
USSD: Current time: 2024-02-22T10:30:00.000Z

USSD: Checking award: Ghana Music Awards
USSD: - votingStartDate: 2024-02-20
USSD: - votingEndDate: 2024-02-28
USSD: - Active stage found: false
USSD: - Award start: 2024-02-20T00:00:00.000Z
USSD: - Award end: 2024-02-28T23:59:00.000Z
USSD: - Award is active: true
USSD: ✓ Award "Ghana Music Awards" added to active list

USSD: Total active awards: 1
```

## Troubleshooting

### Issue: "No active awards available"
**Check:**
1. Award status is `published`
2. Award has `votingStartDate` and `votingEndDate` set
3. Current date is within voting period
4. Check server logs for detailed output

**Fix:**
```javascript
// In your award, ensure these fields are set:
{
  status: 'published',
  votingStartDate: '2024-02-20',
  votingEndDate: '2024-02-28',
  votingStartTime: '00:00',
  votingEndTime: '23:59'
}
```

### Issue: USSD code doesn't respond
**Check:**
1. Is your app deployed to production?
2. Is the webhook URL registered in Arkesel?
3. Is the URL publicly accessible (not localhost)?
4. Check Arkesel webhook logs for errors

### Issue: "Award not found" or "No categories"
**Check:**
1. Award has published categories
2. Categories have published nominees
3. Database connection is working

## Production Checklist

Before going live with USSD:

- [ ] App deployed to production server
- [ ] HTTPS enabled (SSL certificate)
- [ ] Webhook URL registered in Arkesel
- [ ] USSD code purchased/assigned
- [ ] Test with Arkesel's test interface
- [ ] Test with real phone on network
- [ ] Monitor logs for errors
- [ ] Test complete voting flow
- [ ] Test payment integration
- [ ] Verify SMS confirmations work

## Cost Considerations

### Arkesel USSD Pricing
- USSD Code Registration: One-time fee
- Per Session: Charged per USSD session
- SMS Notifications: Separate charges

### Recommended Testing Approach
1. **Development:** Use Postman/cURL (free)
2. **Staging:** Use ngrok + Arkesel test mode (minimal cost)
3. **Production:** Full deployment with real USSD code

## Support

If you continue having issues:

1. **Check Arkesel Status:**
   - Login to Arkesel dashboard
   - Check webhook logs
   - Verify USSD service is active

2. **Check Server Logs:**
   - Look for "USSD:" prefixed logs
   - Check for errors or exceptions

3. **Contact Arkesel Support:**
   - Email: support@arkesel.com
   - Provide: USSD code, webhook URL, error logs

## Summary

**Key Points:**
- USSD requires production deployment (not localhost)
- Must register webhook URL with Arkesel
- Test locally using Postman/cURL
- Use ngrok for temporary public URL during development
- Check logs to debug issues
- Ensure awards have proper voting dates set
