# Hubtel USSD Integration - Sample Responses and Callbacks

## Implementation Summary

### 1. USSD Flow with 4-Second Delay
- USSD session ends immediately (`continueSession: false`)
- 4 seconds later, Hubtel Receive Money API is called
- 5 minutes after payment initiation, automatic status check runs (if webhook not received)

### 2. Webhook Callback Endpoint
**URL:** `https://pawavotes.com/api/webhooks/hubtel`
**Method:** POST

### 3. Transaction Status Check
**Endpoint:** `https://smrsc.hubtel.com/api/merchants/{PREPAID_DEPOSIT_ID}/transactions/status`
**Method:** GET
**Query Parameter:** `clientReference={CLIENT_REFERENCE}`

---

## Sample Responses

### 1. Hubtel Receive Money API Response (Success)

**Request:**
```json
{
  "CustomerName": "233543194406",
  "CustomerMsisdn": "233543194406",
  "CustomerEmail": "233543194406@ussd.pawavotes.com",
  "Channel": "mtn-gh",
  "Amount": 0.5,
  "PrimaryCallbackUrl": "https://pawavotes.com/api/webhooks/hubtel",
  "Description": "Vote payment - USSD-1773318642294-33e0446d0e25",
  "ClientReference": "USSD-1773318642294-33e0446d0e25"
}
```

**Response:**
```json
{
  "Message": "Transaction pending. Expect callback request for final state.",
  "ResponseCode": "0001",
  "Data": {
    "TransactionId": "cd7557556c0f421eb8622b6a9c425453",
    "Description": "Vote payment - USSD-1773318642294-33e0446d0e25",
    "ClientReference": "USSD-1773318642294-33e0446d0e25",
    "Amount": 0.51,
    "Charges": 0.01,
    "AmountAfterCharges": 0.5,
    "AmountCharged": 0.51,
    "DeliveryFee": 0,
    "InvoiceNumber": null
  }
}
```

---

### 2. Webhook Callback (Successful Payment)

**Received at:** `https://pawavotes.com/api/webhooks/hubtel`

```json
{
  "ResponseCode": "0000",
  "Message": "success",
  "Data": {
    "Amount": 0.51,
    "Charges": 0.01,
    "AmountAfterCharges": 0.5,
    "Description": "The MTN Mobile Money payment has been approved and processed successfully.",
    "ClientReference": "USSD-1773318642294-33e0446d0e25",
    "TransactionId": "cd7557556c0f421eb8622b6a9c425453",
    "ExternalTransactionId": "77034709285",
    "AmountCharged": 0.51,
    "OrderId": "cd7557556c0f421eb8622b6a9c425453",
    "PaymentDate": "2026-03-12T12:23:12.0524233Z"
  }
}
```

**Our Response:**
```json
{
  "message": "Webhook processed successfully"
}
```

---

### 3. Webhook Callback (Failed Payment)

**Received at:** `https://pawavotes.com/api/webhooks/hubtel`

```json
{
  "ResponseCode": "2001",
  "Message": "failed",
  "Data": {
    "Amount": 0.51,
    "Charges": 0.01,
    "AmountAfterCharges": 0.5,
    "Description": "Transaction Failed",
    "ClientReference": "USSD-1773318187560-3c307441e5cf",
    "TransactionId": "5e93df3712334f9ea3d038ec810cd032",
    "ExternalTransactionId": "77034709285",
    "AmountCharged": 0.51,
    "OrderId": "5e93df3712334f9ea3d038ec810cd032",
    "PaymentDate": "2026-03-12T12:23:12.1379263Z"
  }
}
```

**Our Response:**
```json
{
  "message": "Payment not successful"
}
```

---

### 4. Transaction Status Check API Response (Successful)

**Request:**
```
GET https://smrsc.hubtel.com/api/merchants/2038138/transactions/status?clientReference=USSD-1773318642294-33e0446d0e25
Authorization: Basic {BASE64_ENCODED_CREDENTIALS}
```

**Response:**
```json
{
  "ResponseCode": "success",
  "Data": {
    "TransactionId": "cd7557556c0f421eb8622b6a9c425453",
    "networkTransactionId": "77034709285",
    "Amount": 0.51,
    "Fees": 0.01,
    "ClientReference": "USSD-1773318642294-33e0446d0e25",
    "Channel": "mtn-gh",
    "CustomerNumber": "233543194406",
    "transactionStatus": "success",
    "CreatedAt": "2026-03-12 12:17:06"
  }
}
```

---

### 5. Transaction Status Check API Response (Pending)

**Response:**
```json
{
  "ResponseCode": "success",
  "Data": {
    "TransactionId": "cd7557556c0f421eb8622b6a9c425453",
    "networkTransactionId": null,
    "Amount": 0.51,
    "Fees": 0.01,
    "ClientReference": "USSD-1773318642294-33e0446d0e25",
    "Channel": "mtn-gh",
    "CustomerNumber": "233543194406",
    "transactionStatus": "pending",
    "CreatedAt": "2026-03-12 12:17:06"
  }
}
```

---

### 6. Transaction Status Check API Response (Failed)

**Response:**
```json
{
  "ResponseCode": "success",
  "Data": {
    "TransactionId": "cd7557556c0f421eb8622b6a9c425453",
    "networkTransactionId": "77034709285",
    "Amount": 0.51,
    "Fees": 0.01,
    "ClientReference": "USSD-1773318642294-33e0446d0e25",
    "Channel": "mtn-gh",
    "CustomerNumber": "233543194406",
    "transactionStatus": "failed",
    "CreatedAt": "2026-03-12 12:17:06"
  }
}
```

---

## Implementation Details

### Webhook Handler Logic
```typescript
// Check ResponseCode
if (ResponseCode !== "0000") {
  // Payment failed or pending
  // Mark pending vote as failed
  return { message: "Payment not successful" };
}

// ResponseCode is "0000" - Payment successful
// Process vote and update counts
```

### Automatic Status Check Logic
```typescript
// After 5 minutes, if webhook not received:
1. Check if pending vote still has status "pending"
2. Call Hubtel Status Check API with clientReference
3. If transactionStatus === "success":
   - Process vote locally
   - Update counts
   - Mark as completed
4. If transactionStatus === "failed":
   - Mark as failed
5. If transactionStatus === "pending":
   - Keep as pending (user may still approve)
```

### Dual Verification System
1. **Primary:** Webhook callback (immediate)
2. **Fallback:** Status Check API (5 minutes after initiation)

This ensures votes are processed even if:
- Webhook is delayed
- Webhook fails to reach our server
- Network issues occur

---

## Environment Variables Required

```env
HUBTEL_API_ID=k23YL1X
HUBTEL_API_KEY=9605038efc2741a59d1d98b942564566
HUBTEL_MERCHANT_ACCOUNT=2038138
HUBTEL_PREPAID_DEPOSIT_ID=2038138
HUBTEL_CALLBACK_URL=https://pawavotes.com/api/webhooks/hubtel
```

---

## IP Whitelisting Required

For Transaction Status Check API to work, our production server IP must be whitelisted by Hubtel.

**Note:** Only requests from whitelisted IPs can reach the Status Check endpoint. Requests from non-whitelisted IPs will return 403 Forbidden or timeout.
