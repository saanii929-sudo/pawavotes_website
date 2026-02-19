# SMS Integration Documentation

## Overview
The system now supports sending voter credentials via SMS in addition to email using the Arkesel SMS API.

## Features

### 1. Single Voter Addition
- When adding a single voter with a phone number, credentials are automatically sent via SMS
- If both email and phone are provided, credentials are sent via both channels
- SMS sending is non-blocking - voter creation succeeds even if SMS fails

### 2. Bulk Upload
- CSV files can include phone numbers in the `phone` column
- System sends SMS to all voters with valid phone numbers
- Bulk upload results show:
  - Number of emails sent/failed
  - Number of SMS sent/failed
- Example CSV format:
  ```csv
  name,email,phone,voterId,department,class
  John Doe,john@example.com,+233244123456,STU001,Computer Science,Year 3
  ```

### 3. Resend Credentials
- Resend button now works for voters with email, phone, or both
- System attempts to send via all available channels
- Success message indicates which channels were used (email, SMS, or both)

### 4. Phone Number Format
The system automatically handles various phone number formats:
- International format: `+233244123456`
- Local format with leading zero: `0244123456`
- Without country code: `244123456`

All formats are converted to international format (+233...) for Ghana numbers.

## Configuration

### Environment Variables
Add to your `.env.local` file:

```env
# SMS Configuration (Arkesel)
ARKESEL_API_KEY=your_api_key_here

# Optional: Custom sender ID (default: PAWAVOTES)
ARKESEL_SENDER_ID=YourSenderID
```

### API Endpoint
The Arkesel SMS API endpoint used:
```
https://sms.arkesel.com/sms/api?action=send-sms&api_key={API_KEY}&to={PHONE}&from={SENDER_ID}&sms={MESSAGE}
```

## SMS Message Format

Voter credentials SMS includes:
- Voter name
- Election title
- Voter token
- Password
- Login URL
- Brief instructions

Example message:
```
Hello John Doe,

Your voting credentials for Student Council Election:

Token: ABC12345
Password: Xy3k9Pq2

Vote at: https://yourapp.com/election/login

Keep these credentials safe.

- PAWAVOTES
```

## SMS Balance Monitoring

The superadmin dashboard includes an SMS Balance card that displays:
- Remaining SMS count
- Account balance
- Currency

This helps administrators monitor SMS usage and ensure sufficient balance for voter notifications.

## API Endpoints

### Check SMS Balance
```
GET /api/superadmin/sms-balance
Authorization: Bearer {token}
```

Response:
```json
{
  "success": true,
  "data": {
    "balance": 50.00,
    "currency": "GHS",
    "smsCount": 1000
  }
}
```

## Service Functions

### `sendSms(params)`
Send a single SMS message.

```typescript
import { sendSms } from '@/services/sms.service';

const result = await sendSms({
  to: '+233244123456',
  message: 'Your message here',
  senderId: 'PAWAVOTES' // optional
});
```

### `sendVoterCredentialsSms(phone, name, token, password, electionTitle)`
Send voter credentials via SMS.

```typescript
import { sendVoterCredentialsSms } from '@/services/sms.service';

const success = await sendVoterCredentialsSms(
  '+233244123456',
  'John Doe',
  'ABC12345',
  'Xy3k9Pq2',
  'Student Council Election'
);
```

### `checkSmsBalance()`
Check remaining SMS balance.

```typescript
import { checkSmsBalance } from '@/services/sms.service';

const result = await checkSmsBalance();
console.log(`Remaining SMS: ${result.smsCount}`);
```

## Error Handling

The system handles SMS failures gracefully:
- Voter creation/update succeeds even if SMS fails
- Errors are logged to console for debugging
- Users see appropriate error messages
- Bulk operations continue even if individual SMS fail

## Best Practices

1. **Phone Number Validation**: Always validate phone numbers before adding voters
2. **Balance Monitoring**: Regularly check SMS balance in superadmin dashboard
3. **Dual Channel**: Provide both email and phone when possible for redundancy
4. **Testing**: Test with a small batch before bulk uploading large voter lists
5. **Cost Management**: Monitor SMS usage to manage costs effectively

## Troubleshooting

### SMS Not Sending
1. Check ARKESEL_API_KEY is correctly set in environment variables
2. Verify phone number format is valid
3. Check SMS balance in superadmin dashboard
4. Review server logs for error messages

### Invalid Phone Numbers
- Ensure phone numbers include country code or start with 0
- Remove spaces, dashes, and parentheses
- Use international format (+233...) for best results

### Balance Issues
- Check SMS balance in superadmin dashboard
- Top up account if balance is low
- Contact Arkesel support for billing issues

## Future Enhancements

Potential improvements:
- SMS templates customization
- Scheduled SMS sending
- SMS delivery reports
- Multi-country phone number support
- SMS cost tracking per election
- Bulk SMS preview before sending
