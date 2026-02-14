# Nomination Pricing Guide

## Quick Reference

### Three Pricing Types

| Type | Description | Price Source | Use Case |
|------|-------------|--------------|----------|
| **Free** | No payment required | N/A | Community awards, open nominations |
| **Fixed** | Same price for all categories | `award.nomination.fixedPrice` | Consistent pricing across award |
| **Category** | Different price per category | `category.price` | Premium categories, flexible pricing |

## Admin Configuration

### Setting Up Free Nominations
```typescript
award.nomination = {
  enabled: true,
  type: 'free',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  startTime: '00:00',
  endTime: '23:59'
}
```

### Setting Up Fixed Price
```typescript
award.nomination = {
  enabled: true,
  type: 'fixed',
  fixedPrice: 50.00, // GHS 50 for all categories
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  startTime: '00:00',
  endTime: '23:59'
}
```

### Setting Up Category-Based Pricing
```typescript
// Award level
award.nomination = {
  enabled: true,
  type: 'category',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  startTime: '00:00',
  endTime: '23:59'
}

// Category level (set individually)
category1.price = 50.00  // Best Actor - GHS 50
category2.price = 75.00  // Best Director - GHS 75
category3.price = 100.00 // Lifetime Achievement - GHS 100
```

## User Experience Flow

### Free Nomination Flow
```
User clicks "Nominate Yourself"
    ↓
Modal shows "Free Nomination"
    ↓
User fills form
    ↓
Clicks "Submit Nomination"
    ↓
Nomination created (draft status)
    ↓
Success message
    ↓
Awaits admin approval
```

### Paid Nomination Flow (Fixed or Category)
```
User clicks "Nominate Yourself"
    ↓
Modal shows "Nomination Fee: GHS X.XX"
    ↓
User fills form
    ↓
Clicks "Proceed to Payment"
    ↓
Paystack modal opens
    ↓
User completes payment
    ↓
Payment verified
    ↓
Nomination created (draft status)
    ↓
Success message
    ↓
Awaits admin approval
```

## Price Calculation Logic

```typescript
// In NominationModal component
const getNominationPrice = () => {
  if (nominationType === 'free') return 0;
  if (nominationType === 'fixed') return nominationFixedPrice;
  if (nominationType === 'category') return categoryPrice;
  return 0;
};

const nominationPrice = getNominationPrice();
const isPaid = nominationType !== 'free' && nominationPrice > 0;
```

## API Integration

### Initialize Payment (Fixed or Category)
```typescript
POST /api/public/nominations/initialize
{
  "awardId": "award123",
  "categoryId": "cat456",
  "name": "John Doe",
  "email": "john@example.com",
  "amount": 5000 // GHS 50.00 in pesewas
}
```

### Submit Free Nomination
```typescript
POST /api/public/nominations/submit
{
  "awardId": "award123",
  "categoryId": "cat456",
  "name": "John Doe",
  "email": "john@example.com"
}
```

## Pricing Strategy Examples

### Example 1: Community Award (Free)
```
Award: Community Choice Awards
Type: Free
All categories: Free nomination
Goal: Maximum participation
```

### Example 2: Professional Award (Fixed)
```
Award: Industry Excellence Awards
Type: Fixed
All categories: GHS 100
Goal: Consistent professional standard
```

### Example 3: Tiered Award (Category-Based)
```
Award: National Film Awards
Type: Category-based

Categories:
- Best Supporting Actor: GHS 50
- Best Actor: GHS 75
- Best Director: GHS 100
- Lifetime Achievement: GHS 150

Goal: Premium categories for prestigious awards
```

## Benefits of Each Type

### Free Nominations
✅ Maximum participation
✅ Community engagement
✅ No barriers to entry
✅ Ideal for grassroots awards
❌ No revenue generation
❌ May receive many low-quality submissions

### Fixed Price
✅ Simple to understand
✅ Consistent pricing
✅ Easy to budget
✅ Fair across all categories
❌ Less flexibility
❌ May not reflect category prestige

### Category-Based
✅ Flexible pricing strategy
✅ Premium categories can charge more
✅ Reflects category value
✅ Maximizes revenue potential
✅ Allows experimentation
❌ More complex to manage
❌ May confuse some users

## Testing Scenarios

### Test Case 1: Free Nomination
1. Set award nomination type to 'free'
2. Click "Nominate Yourself"
3. Verify modal shows "Free Nomination" message
4. Fill form and submit
5. Verify no payment screen appears
6. Verify nomination created successfully

### Test Case 2: Fixed Price
1. Set award nomination type to 'fixed' with price 50
2. Click "Nominate Yourself"
3. Verify modal shows "GHS 50.00" for all categories
4. Fill form and click "Proceed to Payment"
5. Complete Paystack payment
6. Verify nomination created after payment

### Test Case 3: Category-Based
1. Set award nomination type to 'category'
2. Set Category A price to 50, Category B to 75
3. Click "Nominate Yourself" in Category A
4. Verify modal shows "GHS 50.00"
5. Click "Nominate Yourself" in Category B
6. Verify modal shows "GHS 75.00"
7. Complete payment for each
8. Verify correct amounts charged

## Troubleshooting

### Issue: Wrong price displayed
**Check:**
- Award nomination type is set correctly
- Fixed price is set if type is 'fixed'
- Category price is set if type is 'category'
- Props passed correctly to NominationModal

### Issue: Payment not working
**Check:**
- Paystack keys configured
- Amount converted to pesewas (multiply by 100)
- Payment initialization successful
- Webhook configured for verification

### Issue: Free nomination charging
**Check:**
- Award nomination type is exactly 'free'
- No fallback to paid logic
- isPaid variable calculated correctly

## Best Practices

1. **Clear Communication**: Always display pricing before user starts form
2. **Consistent Naming**: Use clear category names that justify pricing
3. **Price Transparency**: Show what the fee covers (processing, admin review, etc.)
4. **Flexible Deadlines**: Allow early bird pricing with category-based approach
5. **Test Thoroughly**: Test all three types before launch
6. **Monitor Conversions**: Track which pricing strategy works best
7. **Provide Support**: Have clear help text for payment issues
