# Public Nomination Feature

## Overview
Implemented a complete public nomination system that allows users to nominate themselves for awards during the nomination period. The system supports three pricing types: free, fixed price, and category-based pricing with Paystack integration.

## Nomination Pricing Types

### 1. Free Nomination
- No payment required
- User submits nomination directly
- Goes to admin for approval
- Best for community-driven awards

### 2. Fixed Price Nomination
- Same price for all categories in the award
- Price set at award level (`award.nomination.fixedPrice`)
- Payment required before submission
- Consistent pricing across all categories

### 3. Category-Based Pricing
- Different price for each category
- Price set at category level (`category.price`)
- Allows flexible pricing strategy
- Premium categories can have higher prices

## Components

### NominationModal Component
**Location:** `components/NominationModal.tsx`

**Features:**
- ✅ **Responsive modal design** - Works on all screen sizes
- 📸 **Image upload** - Profile picture with preview (max 5MB)
- 📝 **Form validation** - Required fields and email validation
- 💳 **Smart payment routing** - Automatically handles free/fixed/category pricing
- 🎨 **Beautiful UI** - Clean, modern design with smooth animations
- ⚡ **Loading states** - Visual feedback during submission
- 🔒 **Secure** - Client-side validation and server-side verification
- 💰 **Dynamic pricing display** - Shows correct price based on nomination type

**Form Fields:**
- Profile Image (Optional) - Upload with preview
- Full Name (Required)
- Email Address (Required)
- Phone Number (Optional)
- Bio (Optional)

## Nomination Flow

### 1. Free Nominations (`type: 'free'`)
1. User clicks "Nominate Yourself" button
2. Modal opens with nomination form
3. User fills in required information
4. Submits form directly (no payment)
5. Nomination created with "draft" status
6. Awaits admin approval
7. Success message: "Nomination submitted successfully! Awaiting approval."

### 2. Fixed Price Nominations (`type: 'fixed'`)
1. User clicks "Nominate Yourself" button
2. Modal opens showing fixed nomination fee (from `award.nomination.fixedPrice`)
3. User fills in required information
4. Clicks "Proceed to Payment"
5. Paystack payment modal opens with fixed price
6. User completes payment
7. Payment verified via webhook
8. Nomination created with "draft" status
9. Awaits admin approval

### 3. Category-Based Pricing (`type: 'category'`)
1. User clicks "Nominate Yourself" button
2. Modal opens showing category-specific fee (from `category.price`)
3. User fills in required information
4. Clicks "Proceed to Payment"
5. Paystack payment modal opens with category price
6. User completes payment
7. Payment verified via webhook
8. Nomination created with "draft" status
9. Awaits admin approval

## Price Determination Logic

```typescript
const getNominationPrice = () => {
  if (nominationType === 'free') return 0;
  if (nominationType === 'fixed') return nominationFixedPrice;
  if (nominationType === 'category') return categoryPrice;
  return 0;
};

const nominationPrice = getNominationPrice();
const isPaid = nominationType !== 'free' && nominationPrice > 0;
```

## API Endpoints Used

### 1. Initialize Nomination (Paid)
**Endpoint:** `POST /api/public/nominations/initialize`

**Request Body:**
```json
{
  "awardId": "string",
  "categoryId": "string",
  "name": "string",
  "email": "string",
  "phone": "string (optional)",
  "bio": "string (optional)",
  "image": "string (optional)",
  "amount": "number (in pesewas)"
}
```

**Response:**
```json
{
  "success": true,
  "reference": "NOM_1234567890_abcd1234",
  "paystackPublicKey": "pk_test_...",
  "message": "Payment initialized successfully"
}
```

### 2. Submit Nomination (Free)
**Endpoint:** `POST /api/public/nominations/submit`

**Request Body:**
```json
{
  "awardId": "string",
  "categoryId": "string",
  "name": "string",
  "email": "string",
  "phone": "string (optional)",
  "bio": "string (optional)",
  "image": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "nominee": { ... },
  "message": "Nomination submitted successfully"
}
```

### 3. Verify Payment
**Endpoint:** `POST /api/public/nominations/verify`

**Request Body:**
```json
{
  "reference": "NOM_1234567890_abcd1234"
}
```

**Response:**
```json
{
  "success": true,
  "nominee": { ... },
  "message": "Nomination submitted and payment confirmed"
}
```

## Nomination Button Visibility

The "Nominate Yourself" button appears only when:

1. ✅ Nominations are enabled for the award (`award.nomination.enabled === true`)
2. ✅ Current date/time is within nomination period
3. ✅ Nomination start date/time has passed
4. ✅ Nomination end date/time has not passed

**Time Calculation:**
```typescript
const isNominationOpen = () => {
  if (!selectedAward?.nomination?.enabled) return false;

  const now = new Date();
  
  if (selectedAward.nomination.startDate && selectedAward.nomination.endDate) {
    const startDate = new Date(selectedAward.nomination.startDate);
    const endDate = new Date(selectedAward.nomination.endDate);
    
    // Add time if available
    if (selectedAward.nomination.startTime) {
      const [hours, minutes] = selectedAward.nomination.startTime.split(':');
      startDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    }
    
    if (selectedAward.nomination.endTime) {
      const [hours, minutes] = selectedAward.nomination.endTime.split(':');
      endDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    }
    
    return now >= startDate && now <= endDate;
  }
  
  return false;
};
```

## Award Interface Updates

Added nomination fields to the Award interface with proper typing:

```typescript
interface Award {
  // ... existing fields
  nomination?: {
    enabled: boolean;
    type: 'free' | 'fixed' | 'category'; // Three pricing types
    fixedPrice?: number; // Used when type is 'fixed'
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
  };
}
```

## Category Interface Updates

Category includes price field for category-based pricing:

```typescript
interface Category {
  _id: string;
  name: string;
  description?: string;
  price?: number; // Used when nomination type is 'category'
  nomineeCount?: number;
  voteCount?: number;
}
```

## Props Passed to NominationModal

```typescript
<NominationModal
  isOpen={nominationModalOpen}
  onClose={() => setNominationModalOpen(false)}
  awardId={selectedAward._id}
  categoryId={selectedCategory._id}
  categoryName={selectedCategory.name}
  awardName={selectedAward.name}
  nominationType={selectedAward.nomination?.type || 'free'}
  nominationFixedPrice={selectedAward.nomination?.fixedPrice}
  categoryPrice={selectedCategory.price}
/>
```

## UI/UX Features

### Button Design
- **Color:** Blue (to differentiate from voting actions)
- **Icon:** Users icon
- **Text:** "Nominate Yourself"
- **Position:** Next to "View Results" button
- **Responsive:** Adapts to mobile screens

### Pricing Display in Modal

The modal dynamically displays pricing information based on nomination type:

**Free Nomination:**
```
┌─────────────────────────────────────┐
│ 🔵 Free Nomination                  │
│ Your nomination will be submitted   │
│ for admin approval                  │
└─────────────────────────────────────┘
```

**Fixed Price:**
```
┌─────────────────────────────────────┐
│ 💚 Nomination Fee:      GHS 50.00   │
│ Fixed price for all categories      │
│ You will be redirected to payment   │
└─────────────────────────────────────┘
```

**Category-Based:**
```
┌─────────────────────────────────────┐
│ 💚 Nomination Fee:      GHS 75.00   │
│ Price for Best Actor category       │
│ You will be redirected to payment   │
└─────────────────────────────────────┘
```
- **Position:** Next to "View Results" button
- **Responsive:** Adapts to mobile screens

### Modal Features
- **Backdrop:** Semi-transparent black overlay
- **Close:** Click backdrop or X button
- **Scroll:** Scrollable content for long forms
- **Sticky Header:** Header stays visible while scrolling
- **Image Preview:** Real-time preview of uploaded image
- **Loading States:** Spinners during upload and submission
- **Error Handling:** Toast notifications for errors
- **Success Feedback:** Success message on completion

## Validation

### Client-Side
- Required fields (name, email)
- Email format validation
- Image size validation (max 5MB)
- Image type validation (images only)

### Server-Side
- Award exists and nominations enabled
- Category exists
- Nomination period is active
- Payment verification (for paid nominations)

## Payment Integration

### Paystack Setup
1. Paystack script loaded dynamically
2. Payment modal opens with pre-filled details
3. User completes payment
4. Callback verifies payment
5. Nomination created on success

### Security
- Payment reference generated server-side
- Payment verification via Paystack API
- Pending nominations stored temporarily
- Completed only after payment confirmation

## Status Flow

1. **Pending Nomination** → Created in PendingNomination collection
2. **Payment** → User completes payment (if paid)
3. **Verification** → Server verifies with Paystack
4. **Draft Nominee** → Created with status "draft"
5. **Admin Approval** → Admin reviews and approves
6. **Published** → Nominee becomes visible and votable

## Error Handling

### Common Errors
- Nominations not enabled
- Nomination period closed
- Invalid email format
- Image too large
- Payment failed
- Network errors

### User Feedback
- Toast notifications for all errors
- Clear error messages
- Retry options
- Loading indicators

## Mobile Optimization

- Responsive modal design
- Touch-friendly buttons
- Optimized image upload
- Smooth animations
- Proper keyboard handling

## Future Enhancements

- [ ] Social media integration
- [ ] Multiple image uploads
- [ ] Video uploads
- [ ] Draft saving
- [ ] Email confirmation
- [ ] SMS notifications
- [ ] Nomination tracking
- [ ] Edit submitted nominations
- [ ] Nomination analytics

## Testing Checklist

### Functional
- ✅ Button appears during nomination period
- ✅ Button hidden outside nomination period
- ✅ Modal opens and closes correctly
- ✅ Form validation works
- ✅ Image upload works
- ✅ Free nomination submission works
- ✅ Paid nomination payment flow works
- ✅ Payment verification works

### UI/UX
- ✅ Responsive on all screen sizes
- ✅ Loading states visible
- ✅ Error messages clear
- ✅ Success feedback provided
- ✅ Smooth animations

### Edge Cases
- ✅ Nomination period boundaries
- ✅ Large image files
- ✅ Invalid email formats
- ✅ Payment cancellation
- ✅ Network failures
