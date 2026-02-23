# Design Document: Organization Auto-Generated Password Feature

## Overview

This document describes the design for automatically generating secure passwords when a superadmin creates a new organization, and delivering those credentials via the organization's preferred communication channel (email, SMS, or both). The feature enhances security by ensuring strong passwords and improves user experience by automating credential delivery.

The system consists of three main components:
1. **Password Generation Service**: Creates cryptographically secure passwords
2. **Credential Delivery Service**: Sends credentials via email and/or SMS
3. **Frontend Interface**: Provides UI for delivery method selection and displays results

## Architecture

### System Components

```
┌─────────────────┐
│   Superadmin    │
│   Frontend UI   │
└────────┬────────┘
         │ POST /api/superadmin/organizations
         │ { name, email, phone, deliveryMethod, ... }
         ▼
┌─────────────────────────────────────────┐
│   Organization Creation API Handler     │
│   (app/api/superadmin/organizations)    │
└────────┬────────────────────────────────┘
         │
         ├──► Password Generator
         │    └──► Returns: plaintext password
         │
         ├──► Password Hasher (bcrypt)
         │    └──► Returns: hashed password
         │
         ├──► Database (MongoDB)
         │    └──► Stores: organization with hashed password
         │
         └──► Credential Delivery Orchestrator
              │
              ├──► Email Service (if deliveryMethod includes 'email')
              │    └──► Sends: credentials via SMTP
              │
              └──► SMS Service (if deliveryMethod includes 'sms')
                   └──► Sends: credentials via Arkesel API
```

### Data Flow

1. Superadmin submits organization creation form with delivery method
2. API validates input (name, email, deliveryMethod, phone if needed)
3. System generates secure random password
4. System hashes password using bcrypt
5. System creates organization record in database
6. System attempts credential delivery based on selected method(s)
7. System returns response with generated password and delivery status

## Components and Interfaces

### 1. Password Generation Module

**Location**: `app/api/superadmin/organizations/route.ts`

**Function Signature**:
```typescript
function generateSecurePassword(): string
```

**Algorithm**:
- Length: 12 characters minimum
- Character sets:
  - Uppercase: A-Z
  - Lowercase: a-z
  - Numbers: 0-9
  - Symbols: !@#$%^&*
- Ensures at least one character from each set
- Uses cryptographically secure randomness (Math.random)
- Shuffles final password to avoid predictable patterns

**Implementation**:
```typescript
function generateSecurePassword(): string {
  const length = 12;
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = '';
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}
```

### 2. Email Delivery Service

**Location**: `lib/email.ts` (existing service)

**Function Signature**:
```typescript
interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

async function sendEmail(options: EmailOptions): Promise<boolean>
```

**Email Template Structure**:
- Subject: "Welcome to PawaVotes - Your Account Credentials"
- HTML formatted body with:
  - Organization name greeting
  - Credentials box (email + password)
  - Login URL
  - Security warning to change password
  - Support contact information

**Configuration**:
- Uses nodemailer with SMTP
- Environment variables:
  - `SMTP_HOST`: SMTP server hostname
  - `SMTP_PORT`: SMTP server port (default: 465)
  - `SMTP_USERNAME`: SMTP authentication username
  - `SMTP_PASSWORD`: SMTP authentication password
  - `SMTP_FROM`: Sender email address

### 3. SMS Delivery Service

**Location**: `services/sms.service.ts` (existing service)

**Function Signature**:
```typescript
interface SendSmsParams {
  to: string;
  message: string;
  senderId?: string;
}

interface SmsResponse {
  success: boolean;
  message?: string;
  error?: string;
}

async function sendSms(params: SendSmsParams): Promise<SmsResponse>
```

**SMS Message Format**:
```
Welcome to PawaVotes! Your login credentials:
Email: {email}
Password: {password}
Login: {loginUrl}
Please change your password after first login.
```

**Configuration**:
- Uses Arkesel SMS API
- Environment variables:
  - `ARKESEL_API_KEY`: API key for SMS service
  - `NEXT_PUBLIC_API_URL`: Base URL for login link
- Phone number formatting:
  - Accepts various formats
  - Normalizes to international format (+233...)
  - Handles scientific notation edge cases

### 4. API Request/Response Interface

**Request Body**:
```typescript
interface CreateOrganizationRequest {
  name: string;              // Required
  email: string;             // Required
  phone?: string;            // Required if deliveryMethod is 'sms' or 'both'
  address?: string;
  website?: string;
  description?: string;
  eventType: 'awards' | 'election';  // Required
  status?: 'active' | 'inactive' | 'suspended';
  deliveryMethod: 'email' | 'sms' | 'both';  // Required
}
```

**Response Body**:
```typescript
interface CreateOrganizationResponse {
  success: boolean;
  message: string;
  data: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    address?: string;
    website?: string;
    description?: string;
    eventType: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    generatedPassword: string;  // Plain text password for superadmin
  };
  delivery: {
    email: {
      sent: boolean;
      error: string | null;
    };
    sms: {
      sent: boolean;
      error: string | null;
    };
  };
}
```

### 5. Frontend Interface

**Location**: `app/superadmin/organizations/page.tsx`

**Form State**:
```typescript
interface OrganizationFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  description: string;
  eventType: 'awards' | 'election';
  status: 'active' | 'inactive' | 'suspended';
  deliveryMethod: 'email' | 'sms' | 'both';  // NEW FIELD
}
```

**UI Components**:
1. **Delivery Method Selector**: Radio buttons or dropdown
   - Options: "Email", "SMS", "Both"
   - Visual indicator when SMS is selected (phone required)
   
2. **Phone Number Field**: 
   - Conditionally required based on deliveryMethod
   - Visual validation feedback
   
3. **Success Modal/Alert**:
   - Displays generated password
   - Shows delivery status for each method
   - Provides copy-to-clipboard functionality
   
4. **Error Handling**:
   - Form validation before submission
   - Clear error messages for failed deliveries
   - Retry options if delivery fails

## Data Models

### Organization Model

**Location**: `models/Organization.ts`

**Schema** (existing, no changes needed):
```typescript
interface IOrganization {
  name: string;
  email: string;
  password: string;  // Hashed password (bcrypt)
  phone?: string;
  address?: string;
  website?: string;
  description?: string;
  logo?: string;
  eventType: 'awards' | 'election';
  status: 'active' | 'inactive' | 'suspended';
  subscriptionPlan?: string;
  serviceFeePercentage: number;
  createdBy: string;
  resetPasswordToken?: string;
  resetPasswordExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

**Note**: The `deliveryMethod` is not stored in the database as it's only needed during creation.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After analyzing all acceptance criteria, I've identified several areas where properties can be combined or where redundancy exists:

**Password Composition Properties (1.2-1.6)**: These five separate properties about password character requirements can be combined into a single comprehensive property that validates all character type requirements at once.

**Email Content Properties (3.2-3.4)**: These three properties about email content can be combined into one property that validates all required email elements are present.

**SMS Content Properties (4.2-4.3)**: These two properties about SMS content can be combined into one property that validates all required SMS elements are present.

**Delivery Status Properties (6.2-6.4)**: These three properties about delivery status in responses are redundant - they all validate the same response structure pattern. Can be combined into one property.

**Hashing Properties (1.8, 7.1, 7.2)**: These three properties all relate to password hashing and storage. They can be combined into one comprehensive property about secure password storage.

### Correctness Properties

Property 1: Password generation always occurs
*For any* organization creation request with valid data, the system should generate a password automatically without requiring manual input.
**Validates: Requirements 1.1**

Property 2: Generated passwords meet complexity requirements
*For any* generated password, it should be at least 12 characters long and contain at least one uppercase letter, one lowercase letter, one numeric digit, and one special character from the set (!@#$%^&*).
**Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.6**

Property 3: Passwords are securely hashed before storage
*For any* organization created, the password stored in the database should be a bcrypt hash and should never equal the plaintext password.
**Validates: Requirements 1.8, 7.1, 7.2**

Property 4: Delivery method validation
*For any* organization creation request, the system should accept only "email", "sms", or "both" as valid delivery methods and reject any other values.
**Validates: Requirements 2.1, 2.2**

Property 5: Conditional phone number requirement
*For any* organization creation request where deliveryMethod is "sms" or "both", the system should require a phone number and reject requests without one.
**Validates: Requirements 2.3**

Property 6: Email delivery includes all required information
*For any* organization creation where email delivery is attempted, the sent email should contain the organization name, email address, generated password, login URL, HTML formatting, and a security warning about changing the password.
**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

Property 7: Email delivery status is reported
*For any* organization creation where email delivery is attempted, the response should include email delivery status with success/failure indicators and error messages if applicable.
**Validates: Requirements 3.5, 3.6, 6.3**

Property 8: SMS delivery includes all required information
*For any* organization creation where SMS delivery is attempted, the sent SMS should contain the email address, generated password, login URL, and a security warning, all within reasonable SMS length limits.
**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

Property 9: SMS delivery status is reported
*For any* organization creation where SMS delivery is attempted, the response should include SMS delivery status with success/failure indicators and error messages if applicable.
**Validates: Requirements 4.5, 4.6, 6.4**

Property 10: Dual delivery independence
*For any* organization creation with deliveryMethod "both", if one delivery method fails, the other should still be attempted and the organization should still be created successfully.
**Validates: Requirements 5.1, 5.2, 5.3, 5.5**

Property 11: Complete delivery status reporting
*For any* organization creation, the response should include the generated password, delivery status for each attempted method, and a summary message indicating overall success.
**Validates: Requirements 5.4, 6.1, 6.2, 6.6**

Property 12: Plaintext passwords are not logged
*For any* organization creation, the application logs should never contain the plaintext password.
**Validates: Requirements 7.5**

Property 13: Validation errors return appropriate status codes
*For any* organization creation request with validation errors (missing fields, invalid delivery method, duplicate email), the system should return HTTP 400 status code with clear error messages.
**Validates: Requirements 8.2, 8.3, 8.5**

Property 14: Frontend displays delivery method options
*For any* organization creation form in the frontend, the delivery method field should offer exactly three options: "Email", "SMS", and "Both".
**Validates: Requirements 9.2**

Property 15: Frontend conditional phone requirement indicator
*For any* state where deliveryMethod is "SMS" or "Both", the frontend should visually indicate that the phone number field is required.
**Validates: Requirements 9.3**

Property 16: Frontend displays creation results
*For any* successful organization creation, the frontend should display the generated password and the delivery status for each attempted method with appropriate success/failure messages.
**Validates: Requirements 9.5, 9.6, 9.7**

## Error Handling

### Validation Errors (HTTP 400)

1. **Missing Required Fields**:
   - Missing name or email
   - Missing deliveryMethod
   - Missing phone when deliveryMethod is "sms" or "both"
   - Response: `{ error: "Field X is required", status: 400 }`

2. **Invalid Input**:
   - Invalid deliveryMethod value (not "email", "sms", or "both")
   - Invalid email format
   - Response: `{ error: "Invalid delivery method", status: 400 }`

3. **Duplicate Organization**:
   - Organization with same email already exists
   - Response: `{ error: "Organization with this email already exists", status: 400 }`

### Delivery Errors (Non-blocking)

1. **Email Delivery Failure**:
   - SMTP connection failure
   - Invalid email address
   - Action: Log error, include in response, but continue with organization creation
   - Response includes: `delivery.email.sent: false, delivery.email.error: "error message"`

2. **SMS Delivery Failure**:
   - SMS API unavailable
   - Invalid phone number format
   - Insufficient SMS balance
   - Action: Log error, include in response, but continue with organization creation
   - Response includes: `delivery.sms.sent: false, delivery.sms.error: "error message"`

3. **Partial Delivery Success** (deliveryMethod: "both"):
   - One method succeeds, one fails
   - Action: Report status of both, organization creation succeeds
   - Response message: "Organization created successfully. Credentials sent via [successful method]. [Failed method] delivery failed."

### Server Errors (HTTP 500)

1. **Database Errors**:
   - MongoDB connection failure
   - Database write failure
   - Response: `{ error: "Failed to create organization", details: "error message", status: 500 }`

2. **Password Hashing Failure**:
   - Bcrypt hashing error
   - Response: `{ error: "Failed to process password", status: 500 }`

### Error Recovery

- **Delivery failures do not rollback organization creation**: Once the organization is saved to the database, delivery failures are non-fatal
- **Superadmin receives generated password in response**: Even if delivery fails, superadmin can manually share credentials
- **Retry mechanism**: Superadmin can manually resend credentials or organization can use password reset flow

## Testing Strategy

### Dual Testing Approach

This feature will be tested using both unit tests and property-based tests:

**Unit Tests**: Focus on specific examples, edge cases, and integration points
- Test specific password generation examples
- Test duplicate email detection
- Test specific delivery method combinations
- Test error message formatting
- Test frontend component rendering

**Property-Based Tests**: Verify universal properties across all inputs
- Generate random organization data and verify password complexity
- Generate random delivery method combinations and verify correct behavior
- Generate random failure scenarios and verify error handling
- Test with many iterations to catch edge cases

### Property-Based Testing Configuration

- **Library**: fast-check (for TypeScript/JavaScript)
- **Minimum iterations**: 100 per property test
- **Test tagging**: Each property test must reference its design property
  - Format: `// Feature: org-auto-password, Property N: [property text]`

### Test Coverage Areas

1. **Password Generation Tests**:
   - Unit: Test specific password examples meet requirements
   - Property: Generate 100+ passwords, verify all meet complexity requirements

2. **Validation Tests**:
   - Unit: Test specific validation scenarios (missing email, invalid deliveryMethod)
   - Property: Generate random invalid inputs, verify all are rejected with 400 status

3. **Delivery Tests**:
   - Unit: Test specific delivery scenarios (email only, SMS only, both)
   - Property: Generate random organization data, verify delivery attempts match deliveryMethod

4. **Error Handling Tests**:
   - Unit: Test specific error scenarios (duplicate email, SMTP failure)
   - Property: Generate random error conditions, verify organization creation succeeds and errors are reported

5. **Frontend Tests**:
   - Unit: Test specific UI interactions (selecting delivery method, form submission)
   - Property: Generate random form states, verify validation and display logic

6. **Security Tests**:
   - Unit: Test specific security scenarios (password not in logs, password hashed)
   - Property: Generate random organizations, verify passwords are never stored or logged in plaintext

### Integration Testing

- Test complete flow from frontend form submission to database storage and delivery
- Test with real SMTP server (test environment)
- Test with SMS API sandbox/test mode
- Verify end-to-end error handling and recovery

### Manual Testing Checklist

- [ ] Create organization with email delivery, verify email received
- [ ] Create organization with SMS delivery, verify SMS received
- [ ] Create organization with both delivery methods, verify both received
- [ ] Test with invalid phone number, verify validation error
- [ ] Test with duplicate email, verify rejection
- [ ] Test with SMTP server down, verify organization still created
- [ ] Verify generated password works for login
- [ ] Verify password change flow works after first login
- [ ] Test frontend UI on mobile and desktop
- [ ] Verify delivery status displayed correctly in UI

## Implementation Notes

### Security Considerations

1. **Password Strength**: 12-character minimum with mixed character types provides strong security
2. **Hashing**: Bcrypt with default salt rounds (10) provides adequate protection
3. **Transmission Security**: 
   - HTTPS for API calls (enforced by Next.js in production)
   - Email sent via TLS/SSL (SMTP port 465)
   - SMS sent via HTTPS API
4. **Logging**: Ensure no plaintext passwords in logs (use password masking)
5. **Response Security**: Generated password in response is acceptable since superadmin is trusted

### Performance Considerations

1. **Async Delivery**: Email and SMS sending are async operations
2. **Timeout Handling**: Set reasonable timeouts for delivery attempts (30 seconds)
3. **Non-blocking**: Delivery failures don't block organization creation
4. **Database Indexing**: Email field should be indexed for duplicate detection

### Scalability Considerations

1. **SMS Balance**: Monitor SMS balance to avoid delivery failures
2. **Email Rate Limiting**: Be aware of SMTP provider rate limits
3. **Concurrent Creations**: Handle multiple simultaneous organization creations
4. **Queue System** (future enhancement): Consider message queue for delivery retries

### Accessibility Considerations

1. **Frontend Form**: 
   - Proper label associations for screen readers
   - Keyboard navigation support
   - Clear error messages
   - High contrast for visual indicators
2. **Email Template**: 
   - Semantic HTML structure
   - Alt text for any images
   - Readable font sizes

### Monitoring and Observability

1. **Metrics to Track**:
   - Organization creation success rate
   - Email delivery success rate
   - SMS delivery success rate
   - Password generation failures (should be zero)
   - Validation error rates

2. **Logging**:
   - Log all organization creations (without passwords)
   - Log delivery attempts and results
   - Log validation failures
   - Log any unexpected errors

3. **Alerts**:
   - Alert on high delivery failure rates
   - Alert on SMS balance below threshold
   - Alert on SMTP connection failures
