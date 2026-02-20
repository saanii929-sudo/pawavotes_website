# Arkesel USSD Integration Guide

## Overview
This document describes the integration of Arkesel USSD service for PawaVotes voting system. The integration replaces the previous Nalo USSD implementation.

## Configuration

### Environment Variables
Add the following to your `.env.local` file:

```env
ARKESEL_USSD_USER_ID=CP9VG7Y5TN_dNri2
ARKESEL_USSD_ENDPOINT=https://sms.arkesel.com/ussd-endpoint-url
```

### Arkesel Dashboard Setup
1. Log in to your Arkesel dashboard
2. Navigate to USSD section
3. Configure your USSD shortcode
4. Set the webhook URL to: `https://yourdomain.com/api/ussd/vote`
5. Ensure the User ID matches the one in your environment variables

## Request/Response Format

### Incoming Request (from Arkesel)
```json
{
  "sessionID": "unique-session-id",
  "userID": "CP9VG7Y5TN_dNri2",
  "newSession": true,
  "msisdn": "233244123456",
  "userData": "1*2*3",
  "network": "MTN"
}
```

### Response (to Arkesel)
```json
{
  "sessionID": "unique-session-id",
  "userID": "CP9VG7Y5TN_dNri2",
  "msisdn": "233244123456",
  "message": "Welcome to PawaVotes!\nSelect an award to vote:\n\n1. Award Name",
  "continueSession": true
}
```

- `continueSession: true` - Continue the USSD session (equivalent to "CON" in Nalo)
- `continueSession: false` - End the USSD session (equivalent to "END" in Nalo)

## USSD Flow

1. **Welcome Screen**: User dials USSD code and sees list of active awards
2. **Award Selection**: User selects an award
3. **Category Selection**: User selects a category within the award
4. **Nominee Method**: User chooses to enter nominee code or browse nominees
5. **Nominee Selection**: User selects or enters nominee
6. **Vote Quantity**: User enters number of votes (1-100)
7. **Confirmation**: User confirms vote and amount
8. **Payment**: Paystack mobile money charge is initiated

## Key Differences from Nalo

| Feature | Nalo Format | Arkesel Format |
|---------|-------------|----------------|
| Session ID | `sessionId` | `sessionID` |
| Phone Number | `phoneNumber` | `msisdn` |
| User Input | `text` | `userData` |
| New Session | Implicit | `newSession` boolean |
| Continue Session | `response: "CON ..."` | `continueSession: true` |
| End Session | `response: "END ..."` | `continueSession: false` |
| User ID | Not required | `userID` required |

## Payment Integration

The USSD system integrates with Paystack for mobile money payments:
- Supports MTN, Vodafone, and AirtelTigo networks
- Automatically detects network from phone number
- Sends payment prompt to user's phone
- Vote is recorded with "pending" status until payment confirmation

## Session Management

- Sessions are stored in MongoDB using the `UssdSession` model
- Sessions auto-expire after 5 minutes of inactivity
- Each session tracks:
  - Current step in the flow
  - Selected award, category, and nominee
  - Vote quantity and amount
  - Phone number and session ID

## Testing

To test the USSD integration:

1. Ensure your webhook URL is publicly accessible (use ngrok for local testing)
2. Configure the webhook in Arkesel dashboard
3. Dial your USSD shortcode from a mobile phone
4. Follow the prompts to complete a test vote

## Troubleshooting

### Common Issues

1. **Session not found**: Check that `sessionID` is being properly stored and retrieved
2. **Invalid response format**: Ensure all responses include `sessionID`, `userID`, `msisdn`, `message`, and `continueSession`
3. **Payment fails**: Verify Paystack credentials and that the phone number format is correct
4. **Network detection fails**: Check that phone number prefixes are correctly mapped to networks

### Logs

Monitor your application logs for:
- USSD request/response data
- Session creation and updates
- Payment initiation results
- Error messages

## API Endpoint

**POST** `/api/ussd/vote`

Handles all USSD interactions for the voting system.

## Security Considerations

1. Validate that incoming requests are from Arkesel (check User ID)
2. Sanitize user input to prevent injection attacks
3. Implement rate limiting to prevent abuse
4. Store sensitive data (payment info) securely
5. Use HTTPS for all webhook communications

## Support

For issues with:
- Arkesel USSD service: Contact Arkesel support
- Payment processing: Contact Paystack support
- Application logic: Check application logs and MongoDB sessions
