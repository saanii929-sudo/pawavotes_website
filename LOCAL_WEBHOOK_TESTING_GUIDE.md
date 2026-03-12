# Local Webhook Testing Guide

## Problem
Hubtel webhooks cannot reach `http://localhost:3000` because it's not accessible from the internet.

## Solution: Use ngrok (Recommended)

### Step-by-Step Setup

#### 1. Install ngrok

**Windows:**
```bash
choco install ngrok
# Or download from https://ngrok.com/download
```

**Mac:**
```bash
brew install ngrok
```

**Linux:**
```bash
# Download and extract
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
tar xvzf ngrok-v3-stable-linux-amd64.tgz
sudo mv ngrok /usr/local/bin
```

#### 2. Sign up for ngrok (Optional but Recommended)

1. Go to https://dashboard.ngrok.com/signup
2. Get your auth token
3. Configure ngrok:
   ```bash
   ngrok config add-authtoken YOUR_AUTH_TOKEN
   ```

#### 3. Start Your Development Server

```bash
npm run dev
```

Your app should be running on `http://localhost:3000`

#### 4. Start ngrok Tunnel

Open a new terminal and run:

```bash
ngrok http 3000
```

You'll see output like:
```
ngrok                                                                    

Session Status                online
Account                       your@email.com (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123def456.ngrok-free.app -> http://localhost:3000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

#### 5. Copy Your Public URL

From the output above, copy the HTTPS URL:
```
https://abc123def456.ngrok-free.app
```

#### 6. Update Your Environment Variables

Create or update `.env.local`:

```env
# Hubtel Credentials (keep these)
HUBTEL_API_ID=k23YL1X
HUBTEL_API_KEY=9605038efc2741a59d1d98b942564566
HUBTEL_MERCHANT_ACCOUNT=2038138

# Update these with your ngrok URL
HUBTEL_CALLBACK_URL=https://abc123def456.ngrok-free.app/api/webhooks/hubtel
HUBTEL_RETURN_URL=https://abc123def456.ngrok-free.app/vote-success
HUBTEL_CANCELLATION_URL=https://abc123def456.ngrok-free.app
NEXT_PUBLIC_API_URL=https://abc123def456.ngrok-free.app

# Database (keep your existing)
MONGODB_URI=your_mongodb_connection_string
```

#### 7. Restart Your Development Server

Stop your dev server (Ctrl+C) and restart:

```bash
npm run dev
```

#### 8. Test Payment Flow

1. Open your app at the ngrok URL: `https://abc123def456.ngrok-free.app`
2. Initiate a vote or nomination
3. Complete payment on Hubtel
4. Hubtel will send webhook to: `https://abc123def456.ngrok-free.app/api/webhooks/hubtel`
5. ngrok forwards it to: `http://localhost:3000/api/webhooks/hubtel`
6. Check your terminal logs to see webhook received

---

## Monitoring Webhooks

### ngrok Web Interface

ngrok provides a web interface to inspect all HTTP requests:

1. Open http://127.0.0.1:4040 in your browser
2. You'll see all requests including webhooks
3. Click on any request to see:
   - Request headers
   - Request body
   - Response status
   - Response body

This is extremely useful for debugging!

---

## Alternative: localtunnel (Completely Free)

If you don't want to sign up for ngrok:

#### 1. Install localtunnel

```bash
npm install -g localtunnel
```

#### 2. Start Your Dev Server

```bash
npm run dev
```

#### 3. Create Tunnel

```bash
lt --port 3000 --subdomain pawavotes
```

Output:
```
your url is: https://pawavotes.loca.lt
```

#### 4. Update .env.local

```env
HUBTEL_CALLBACK_URL=https://pawavotes.loca.lt/api/webhooks/hubtel
NEXT_PUBLIC_API_URL=https://pawavotes.loca.lt
```

**Note:** First time visitors will see a warning page. Click "Continue" to proceed.

---

## Testing Checklist

### Before Testing
- [ ] ngrok/localtunnel is running
- [ ] Dev server is running
- [ ] .env.local updated with public URL
- [ ] Dev server restarted after .env.local changes

### Test Web Vote
1. [ ] Open app at ngrok URL
2. [ ] Navigate to voting page
3. [ ] Select nominee and vote quantity
4. [ ] Click "Vote Now"
5. [ ] Complete payment on Hubtel
6. [ ] Check terminal for webhook logs
7. [ ] Verify vote appears in database
8. [ ] Check ngrok web interface (http://127.0.0.1:4040)

### Test USSD Vote
1. [ ] Dial USSD code
2. [ ] Complete voting flow
3. [ ] Approve payment on phone
4. [ ] Check terminal for webhook logs
5. [ ] Verify vote appears in database
6. [ ] Check ngrok web interface

### Test Nomination
1. [ ] Open nomination page
2. [ ] Fill in nominee details
3. [ ] Complete payment
4. [ ] Check webhook logs
5. [ ] Verify nominee created

---

## Debugging Tips

### 1. Check ngrok is Running

```bash
# You should see this in ngrok terminal
Forwarding  https://abc123.ngrok-free.app -> http://localhost:3000
```

### 2. Check Environment Variables

Add this to your webhook handler temporarily:

```typescript
// app/api/webhooks/hubtel/route.ts
export async function POST(req: NextRequest) {
  console.log('=== WEBHOOK RECEIVED ===');
  console.log('Environment check:');
  console.log('HUBTEL_CALLBACK_URL:', process.env.HUBTEL_CALLBACK_URL);
  console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
  
  // ... rest of your code
}
```

### 3. Test Webhook Endpoint Manually

```bash
# Test your webhook endpoint
curl -X POST https://abc123.ngrok-free.app/api/webhooks/hubtel \
  -H "Content-Type: application/json" \
  -d '{
    "ResponseCode": "0000",
    "Status": "Success",
    "Data": {
      "ClientReference": "TEST123",
      "Status": "Paid",
      "Amount": 5.00
    }
  }'
```

### 4. Check ngrok Web Interface

Open http://127.0.0.1:4040 and look for:
- POST requests to `/api/webhooks/hubtel`
- Request body from Hubtel
- Response status (should be 200)

### 5. Common Issues

**Issue**: ngrok URL changes every time
**Solution**: Sign up for ngrok account (free) or use paid plan for static URLs

**Issue**: "ERR_NGROK_3200" error
**Solution**: Sign up and add auth token: `ngrok config add-authtoken YOUR_TOKEN`

**Issue**: Webhook not received
**Solution**: 
- Check ngrok is running
- Check .env.local has correct URL
- Restart dev server after changing .env.local
- Check ngrok web interface for incoming requests

**Issue**: "Cannot GET /" on ngrok URL
**Solution**: This is normal if you don't have a home page. Try `/find-vote` or `/login`

---

## Production Deployment

When deploying to production:

1. **Remove ngrok URLs** from .env
2. **Use your production domain**:
   ```env
   HUBTEL_CALLBACK_URL=https://yourdomain.com/api/webhooks/hubtel
   NEXT_PUBLIC_API_URL=https://yourdomain.com
   ```
3. **Whitelist production IP** with Hubtel (for Status Check API)
4. **Test webhooks** on production

---

## Quick Reference

### Start Testing Session

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Start ngrok
ngrok http 3000

# Copy ngrok URL and update .env.local
# Restart dev server (Ctrl+C in Terminal 1, then npm run dev)
```

### Stop Testing Session

```bash
# Stop ngrok (Ctrl+C in Terminal 2)
# Stop dev server (Ctrl+C in Terminal 1)
# Revert .env.local to localhost URLs (optional)
```

---

## Cost Comparison

| Service | Free Tier | Paid Plans | Best For |
|---------|-----------|------------|----------|
| ngrok | 1 online process, random URLs | $8/mo for static URLs | Most users |
| localtunnel | Unlimited, free forever | N/A | Budget-conscious |
| Cloudflare Tunnel | Unlimited, free forever | N/A | Stable connections |
| webhook.site | Inspection only | N/A | Quick testing |

---

## Recommendation

**For development**: Use ngrok (free tier)
- Easy to set up
- Great web interface for debugging
- Reliable

**For production**: Use your actual domain
- No tunneling needed
- Better performance
- More secure
