# Nominee Code Generation & Approval Workflow

## Overview
This document explains the complete nominee code generation and approval workflow implemented in the system.

## Award Code Generation

### How It Works
When an award is created, the system automatically generates a unique award code based on the award name.

### Algorithm
1. Split award name by spaces
2. Take the first letter of each word
3. Join and convert to uppercase
4. Handle duplicates by adding numeric suffix

### Examples
- "Ghana Music Awards" → `GMA`
- "Best Actor Awards" → `BAA`
- "Ghana Music Awards" (duplicate) → `GMA2`

### Implementation
- **Model**: `models/Award.ts` - Added `code` field (required, unique, uppercase, indexed)
- **API**: `app/api/awards/route.ts` - Auto-generates code on award creation
- **Display**: Award code shown in red badge on award cards

---

## Nominee Code Generation

### How It Works
Nominee codes are generated using the award code + a sequential 3-digit number.

### Format
`{AWARD_CODE}{3-DIGIT-NUMBER}`

### Examples
- First nominee: `GMA001`
- Second nominee: `GMA002`
- 100th nominee: `GMA100`

### Two Types of Nominations

#### 1. Organizer-Created Nominees
- Created by award organizers in the dashboard
- **Status**: Auto-accepted
- **Code**: Generated immediately upon creation
- **Published**: Automatically published

#### 2. Self-Nominations
- Submitted by users via the public nomination form
- **Status**: Pending approval
- **Code**: NOT generated until approved
- **Published**: Only after organizer approval

---

## Approval Workflow

### Step 1: User Submits Self-Nomination
**Location**: `/find-vote` page → Nomination Modal

**What Happens**:
- User fills out nomination form (name, email, phone, bio, image)
- System creates nominee with:
  - `nominationType: 'self'`
  - `nominationStatus: 'pending'`
  - `status: 'draft'`
  - `nomineeCode: null` (no code yet)

**API**: `POST /api/public/nominations/submit`

### Step 2: Organizer Reviews Nominations
**Location**: `/dashboard/awards/nomination` page

**Features**:
- View all pending nominations
- Filter by status (Pending, Accepted, Rejected)
- Filter by category
- Search by nominee name
- See "Self-Nomination" badge for user-submitted nominations

### Step 3: Organizer Approves/Declines

#### Approve Action
**API**: `POST /api/nominees/{id}/approve`

**What Happens**:
1. Generate unique nominee code (e.g., `GMA001`)
2. Update nominee:
   - `nominationStatus: 'accepted'`
   - `status: 'published'`
   - `nomineeCode: '{AWARD_CODE}{NUMBER}'`
3. Send approval email to nominee with:
   - Congratulations message
   - Nominee code
   - Next steps

#### Decline Action
**API**: `POST /api/nominees/{id}/decline`

**What Happens**:
1. Update nominee:
   - `nominationStatus: 'rejected'`
   - `status: 'rejected'`
2. Decrement category and award nominee counts
3. No email sent (can be added if needed)

### Step 4: Nominee Receives Email
**Email Service**: `lib/email.ts`

**Email Content**:
- Professional HTML template
- Nominee code prominently displayed
- Award name and details
- Next steps and encouragement

**Note**: Currently logs to console. To enable actual email sending:
1. Install email service (SendGrid, Resend, etc.)
2. Add API key to environment variables
3. Uncomment email sending code in `lib/email.ts`

---

## UI Display

### Nominee Code Display
Nominee codes are displayed in a red badge throughout the system:

#### Dashboard - Nominations Page
- Shows nominee code next to nominee name
- "Self-Nomination" badge for user-submitted nominations
- Approve/Decline buttons only for pending nominations

#### Dashboard - Nominees Page
- Shows nominee code in nominee list
- "Self-Nomination" badge indicator
- Edit/Delete actions available

#### Find-Vote Page
- Award code shown on award cards
- Nominee codes visible in nominee listings

---

## Database Schema

### Award Model
```typescript
{
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  }
}
```

### Nominee Model
```typescript
{
  nomineeCode: {
    type: String,
    unique: true,
    sparse: true, // Allows null values
    uppercase: true,
    trim: true,
  },
  email: String,
  phone: String,
  nominationType: {
    type: String,
    enum: ['organizer', 'self'],
    default: 'organizer',
  },
  nominationStatus: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
  }
}
```

---

## API Endpoints

### Award Code
- `POST /api/awards` - Creates award with auto-generated code
- `GET /api/public/awards?search={code}` - Search awards by code

### Nominee Code
- `POST /api/nominees` - Creates nominee (organizer) with code
- `POST /api/public/nominations/submit` - Creates nominee (self) without code
- `POST /api/nominees/{id}/approve` - Approves and generates code
- `POST /api/nominees/{id}/decline` - Declines nomination
- `GET /api/nominees?awardId={id}&status={status}` - Filter by status

---

## Testing the Workflow

### Test Organizer-Created Nominee
1. Go to `/dashboard/awards/nominees`
2. Select an award
3. Click "Add Nominees"
4. Fill form and submit
5. ✅ Nominee should have code immediately (e.g., `GMA001`)

### Test Self-Nomination Approval
1. Go to `/find-vote`
2. Select an award with nominations enabled
3. Click "Nominate" button
4. Fill form with email and submit
5. Go to `/dashboard/awards/nomination`
6. Find the pending nomination
7. Click approve
8. ✅ Nominee should get code and email
9. Check console for email log

### Test Filtering
1. Go to `/dashboard/awards/nomination`
2. Use status filter: Pending, Accepted, Rejected
3. Use category filter
4. Use search by name
5. ✅ All filters should work correctly

---

## Future Enhancements

### Email Service Integration
To enable actual email sending:

1. **Install SendGrid**:
```bash
npm install @sendgrid/mail
```

2. **Add Environment Variable**:
```env
SENDGRID_API_KEY=your_api_key_here
FROM_EMAIL=noreply@yourdomain.com
```

3. **Update `lib/email.ts`**:
```typescript
import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    await sgMail.send({
      to: options.to,
      from: process.env.FROM_EMAIL!,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}
```

### Additional Features
- Send rejection email with reason
- Bulk approve/decline nominations
- Email templates customization
- SMS notifications
- Nominee dashboard to track status
- Re-submit declined nominations

---

## Troubleshooting

### Nominee Code Not Generated
- Check if award has a code
- Verify nominee is being approved (not just updated)
- Check database for duplicate codes

### Email Not Sent
- Check console logs for email content
- Verify email service is configured
- Check environment variables
- Verify nominee has email address

### Approve Button Not Showing
- Only shows for pending nominations
- Check nomination status in database
- Verify user has proper permissions

---

## Files Modified/Created

### Created
- `app/api/nominees/[id]/approve/route.ts` - Approval endpoint
- `app/api/nominees/[id]/decline/route.ts` - Decline endpoint
- `lib/email.ts` - Email service utility
- `NOMINEE_CODE_WORKFLOW.md` - This documentation

### Modified
- `models/Nominee.ts` - Added nominee code fields
- `models/Award.ts` - Added award code field
- `app/api/nominees/route.ts` - Added code generation
- `app/api/awards/route.ts` - Added award code generation
- `app/api/public/nominations/submit/route.ts` - Self-nomination handling
- `app/dashboard/awards/nomination/page.tsx` - Approval UI
- `app/dashboard/awards/nominees/page.tsx` - Display nominee codes
- `app/(home)/find-vote/page.tsx` - Display award codes

---

## Summary

The nominee code system provides a professional way to track and manage nominations:

1. **Award codes** identify each award program uniquely
2. **Nominee codes** provide unique identifiers for each nominee
3. **Approval workflow** ensures quality control for self-nominations
4. **Email notifications** keep nominees informed of their status
5. **UI indicators** clearly show nomination type and status

The system is fully functional and ready for production use. Email sending is currently logged to console but can be easily integrated with any email service provider.
