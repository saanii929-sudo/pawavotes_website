# Paystack Integration Troubleshooting Guide

## Issue: Paystack Popup Not Appearing

### Fixes Implemented

1. **Script Loading Check**
   - Now checks if PaystackPop is already loaded before creating new script
   - Prevents duplicate script loading
   - Handles cases where script exists but isn't loaded yet

2. **Better Error Handling**
   - Added try-catch blocks around Paystack initialization
   - Clear error messages for different failure scenarios
   - Loading state properly reset on errors

3. **Script Preloading**
   - Paystack script preloaded when modal opens for paid nominations
   - Reduces delay when user clicks "Proceed to Payment"

4. **Console Logging**
   - Added detailed console logs for debugging
   - Tracks payment flow from initialization to completion
   - Helps identify where the process fails

### How to Debug

Open browser console (F12) and look for these logs:

```
1. "Initializing payment for nomination:" - Payment process started
2. "Payment initialization response:" - API response received
3. "PaystackPop already loaded" OR "Loading Paystack script..." - Script status
4. "Initializing Paystack popup..." - About to open popup
5. "PaystackPop is available, setting up handler..." - Handler being created
6. "Opening Paystack iframe..." - Popup should appear now
```

### Common Issues and Solutions

#### Issue 1: "PaystackPop is not defined"
**Cause:** Paystack script failed to load
**Solutions:**
- Check internet connection
- Verify Paystack CDN is accessible
- Check browser console for script loading errors
- Try refreshing the page

#### Issue 2: Payment initialization fails
**Cause:** API error or missing configuration
**Solutions:**
- Check console for "Payment initialization response"
- Verify Paystack public key is configured
- Check API endpoint is working
- Verify nomination data is valid

#### Issue 3: Popup opens but closes immediately
**Cause:** Invalid Paystack configuration
**Solutions:**
- Verify Paystack public key is correct
- Check amount is in pesewas (multiply by 100)
- Verify email format is valid
- Check reference is unique

#### Issue 4: Script loads but popup doesn't open
**Cause:** Handler setup error
**Solutions:**
- Check console for "Error setting up Paystack"
- Verify all required parameters are provided
- Check Paystack key format
- Try clearing browser cache

### Testing Checklist

Before testing, ensure:
- [ ] Paystack public key is configured in environment
- [ ] Internet connection is stable
- [ ] Browser allows popups from your domain
- [ ] Console is open to see logs

### Test Steps

1. **Open Modal**
   - Click "Nominate Yourself" button
   - Modal should open
   - For paid nominations, Paystack script should start loading

2. **Fill Form**
   - Enter name and email
   - Optional: Add phone, bio, image
   - Check pricing display is correct

3. **Submit**
   - Click "Proceed to Payment"
   - Check console logs
   - Paystack popup should appear within 1-2 seconds

4. **Complete Payment**
   - Enter test card details (if in test mode)
   - Complete payment
   - Verify success message appears

### Test Card Details (Paystack Test Mode)

```
Card Number: 4084 0840 8408 4081
CVV: 408
Expiry: Any future date
PIN: 0000
OTP: 123456
```

### Environment Variables

Ensure these are set:

```env
# Public key (client-side)
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx

# Secret key (server-side)
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
```

### Code Flow

```
User clicks "Proceed to Payment"
    ↓
Validate form data
    ↓
Set loading state
    ↓
Call /api/public/nominations/initialize
    ↓
Receive reference and public key
    ↓
Check if PaystackPop is loaded
    ↓
If not loaded: Load script
    ↓
Initialize PaystackPop.setup()
    ↓
Call handler.openIframe()
    ↓
Paystack popup appears
    ↓
User completes payment
    ↓
Callback triggered
    ↓
Call /api/public/nominations/verify
    ↓
Show success/error message
    ↓
Reset loading state
```

### Browser Compatibility

Tested and working on:
- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers

### Known Limitations

1. **Popup Blockers**: Some browsers may block the popup
   - Solution: User must allow popups for your domain

2. **Script Loading Time**: First load may take 1-2 seconds
   - Solution: Script is now preloaded when modal opens

3. **Network Issues**: Slow connections may delay popup
   - Solution: Loading indicator shows user to wait

### Advanced Debugging

#### Check if Paystack script loaded:
```javascript
console.log(typeof PaystackPop); // Should be "object" or "function"
```

#### Check script in DOM:
```javascript
console.log(document.querySelector('script[src*="paystack"]'));
```

#### Manual test:
```javascript
// In browser console after script loads
PaystackPop.setup({
  key: 'pk_test_xxxxx',
  email: 'test@example.com',
  amount: 5000,
  currency: 'GHS',
  ref: 'TEST_' + Date.now(),
  callback: (response) => console.log('Success:', response),
  onClose: () => console.log('Closed')
}).openIframe();
```

### Getting Help

If issues persist:

1. **Check Console Logs**
   - Look for error messages
   - Note which step fails
   - Copy error details

2. **Check Network Tab**
   - Verify API calls succeed
   - Check response data
   - Look for CORS errors

3. **Verify Configuration**
   - Paystack keys are correct
   - Environment variables loaded
   - API endpoints accessible

4. **Test in Incognito**
   - Rules out extension conflicts
   - Fresh browser state
   - No cached scripts

### Contact Support

If you still have issues, provide:
- Browser and version
- Console error messages
- Network tab screenshots
- Steps to reproduce
- Environment (dev/staging/production)
