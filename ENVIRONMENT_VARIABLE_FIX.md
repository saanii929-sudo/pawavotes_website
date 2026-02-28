# Environment Variable Fix for SMS URLs

## Issue
SMS messages were showing `localhost:3000` URLs even when deployed to production because the environment variable was not set correctly.

## Root Cause
The codebase was using two different environment variable names:
- `NEXT_PUBLIC_APP_URL` (used in SMS service and some APIs)
- `NEXT_PUBLIC_API_URL` (defined in .env.example)

When deployed, `NEXT_PUBLIC_APP_URL` was undefined, causing the code to fall back to `http://localhost:3000`.

## Solution
All code has been standardized to use `NEXT_PUBLIC_API_URL` consistently.

## Action Required
**You MUST update your production environment variables:**

1. Go to your hosting platform (Vercel, Netlify, etc.)
2. Find the environment variables section
3. Add or update: `NEXT_PUBLIC_API_URL=https://pawavotes.com`
4. Redeploy your application

## Files Updated
- `services/sms.service.ts` - Voter credentials SMS
- `app/api/vote/initiate/route.ts` - Payment callback URL
- `app/api/elections/voters/route.ts` - Voter email function
- `app/api/elections/voters/bulk/route.ts` - Bulk voter email function
- `app/api/elections/voters/[id]/route.ts` - Single voter email
- `app/api/elections/voters/[id]/resend/route.ts` - Resend credentials
- `app/api/auth/forgot-password/route.ts` - Password reset URL
- `.env.example` - Added documentation comment

## Testing
After updating the environment variable and redeploying:
1. Add a new voter to an election
2. Check the SMS message - it should now show your production domain
3. Check email messages - they should already be working correctly

## Note
The email system was working correctly because it was already using `NEXT_PUBLIC_API_URL`. Only SMS messages were affected by this issue.
