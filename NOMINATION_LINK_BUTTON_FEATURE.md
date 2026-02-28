# Nomination Link Button Feature

## Overview
Added a "Generate Nomination Link" button to the Awards Nominees page that allows organizers to generate and copy a public nomination link for their award. The system tracks whether a link has been generated for each award and persists this state across sessions.

## Location
**Dashboard → Awards → Nominees Page**

## How It Works

### First Time (Generate Link)
1. Organizer clicks "Generate Link" button (blue button next to Download)
2. System calls API to mark the link as generated in the database
3. System generates the public nomination URL: `https://pawavotes.com/nominate/[awardId]`
4. Button changes to "Copy Link" (purple button)
5. A blue info banner appears below showing the full link
6. Success toast: "Nomination link generated!"
7. **State is saved to database** - Link remains generated even after page refresh

### After Generation (Copy Link)
1. Button shows as "Copy Link" (purple) whenever the award is selected
2. Organizer can click to copy the link to clipboard
3. Success toast: "Nomination link copied to clipboard!"
4. Link can be copied multiple times
5. Info banner remains visible with the link
6. **Persists across sessions** - Even after logout/login

### Switching Awards
- System checks each award's `settings.nominationLinkGenerated` field
- If true, shows "Copy Link" button and displays the link
- If false, shows "Generate Link" button
- Each award maintains its own state independently

## Database Tracking

### Award Model Field
```typescript
settings: {
  nominationLinkGenerated: boolean; // Default: false
}
```

### API Endpoint
```
POST /api/awards/[id]/generate-nomination-link
```

**Response:**
```json
{
  "success": true,
  "nominationLink": "https://pawavotes.com/nominate/[awardId]",
  "message": "Nomination link generated successfully"
}
```

## Features

✅ **Persistent State** - Link generation status saved to database
✅ **One-Time Generation** - Can only generate once per award
✅ **Easy Copying** - Copy to clipboard with one click
✅ **Visual Feedback** - Button changes color and icon based on state
✅ **Persistent Display** - Link remains visible in info banner
✅ **Multiple Copy** - Can copy the link multiple times
✅ **Award-Specific** - Each award tracks its own state
✅ **Session Persistence** - State survives page refresh and logout
✅ **Responsive Design** - Works on mobile and desktop
✅ **Toast Notifications** - Clear feedback for all actions
✅ **Security** - Only authorized users can generate links

## Technical Implementation

### Database Schema
```typescript
// models/Award.ts
settings: {
  nominationLinkGenerated: {
    type: Boolean,
    default: false,
  }
}
```

### API Endpoint
```typescript
// app/api/awards/[id]/generate-nomination-link/route.ts
POST /api/awards/[id]/generate-nomination-link
- Marks award.settings.nominationLinkGenerated = true
- Returns the nomination link
- Requires authentication
- Checks user permissions
```

### Frontend Logic
```typescript
// On award selection
useEffect(() => {
  if (selectedAward.settings?.nominationLinkGenerated) {
    // Show "Copy Link" button and display link
    setNominationLinkGenerated(true);
    setNominationLink(generatedLink);
  } else {
    // Show "Generate Link" button
    setNominationLinkGenerated(false);
  }
}, [selectedAward]);

// On generate click
handleGenerateNominationLink() {
  // Call API to mark as generated
  // Update local state
  // Update award object
}
```

## Benefits

1. **Persistent Tracking** - Never lose track of generated links
2. **One-Time Generation** - Prevents duplicate link generation
3. **Cross-Session** - Works after logout/login
4. **Team Collaboration** - All team members see the same state
5. **Audit Trail** - Can track which awards have public nomination enabled
6. **Easy Management** - Clear visual indication of link status

## Files Modified
- `models/Award.ts` - Added `nominationLinkGenerated` field
- `app/api/awards/[id]/generate-nomination-link/route.ts` - New API endpoint
- `app/dashboard/awards/nominees/page.tsx` - Updated UI and logic

## Files Created
- `app/api/awards/[id]/generate-nomination-link/route.ts` - API endpoint

## Related Files
- `app/(home)/nominate/[awardId]/page.tsx` - Public nomination page
- `app/api/public/awards/[id]/route.ts` - Public award API
- `PUBLIC_NOMINATION_LINK.md` - Complete documentation

## UI Components

### Generate Link Button (Initial State)
- **Color**: Blue (bg-blue-600)
- **Icon**: Link icon
- **Text**: "Generate Link"
- **Position**: Next to Download button

### Copy Link Button (After Generation)
- **Color**: Purple (bg-purple-600)
- **Icon**: Copy icon
- **Text**: "Copy Link"
- **Position**: Same as Generate button

### Info Banner (After Generation)
- **Background**: Light blue (bg-blue-50)
- **Border**: Blue border
- **Content**: 
  - Info icon
  - Label: "Public Nomination Link:"
  - Full URL in code format
  - Copy button (small)
  - Help text explaining usage

## Features

✅ **One-Click Generation** - Instantly creates the nomination link
✅ **Easy Copying** - Copy to clipboard with one click
✅ **Visual Feedback** - Button changes color and icon after generation
✅ **Persistent Display** - Link remains visible in info banner
✅ **Multiple Copy** - Can copy the link multiple times
✅ **Award-Specific** - Each award gets its own unique link
✅ **Reset on Switch** - Button resets when changing awards
✅ **Responsive Design** - Works on mobile and desktop
✅ **Toast Notifications** - Clear feedback for all actions

## User Flow

```
1. Organizer selects an award
   ↓
2. Clicks "Generate Link" button
   ↓
3. Link is generated and displayed
   ↓
4. Button changes to "Copy Link"
   ↓
5. Organizer clicks "Copy Link"
   ↓
6. Link copied to clipboard
   ↓
7. Organizer pastes link on social media/WhatsApp/email
   ↓
8. Users click link and submit nominations
```

## Technical Implementation

### State Variables
```typescript
const [nominationLinkGenerated, setNominationLinkGenerated] = useState(false);
const [nominationLink, setNominationLink] = useState("");
```

### Functions
```typescript
handleGenerateNominationLink() - Generates the link
handleCopyNominationLink() - Copies link to clipboard
```

### Link Format
```
https://pawavotes.com/nominate/[awardId]
```

## Benefits

1. **Faster Nominations** - Direct link eliminates navigation steps
2. **Easy Sharing** - One-click copy makes sharing effortless
3. **Social Media Ready** - Perfect for WhatsApp, Facebook, Twitter
4. **Professional** - Clean, organized link management
5. **User-Friendly** - Clear visual states and feedback
6. **Mobile Optimized** - Works perfectly on all devices

## Use Cases

### Social Media Campaigns
```
🎉 Nominations are now open!

Submit your nomination here:
[paste link]

Don't miss this opportunity! 🏆
```

### WhatsApp Groups
```
Hello everyone! 👋

We're accepting nominations for [Award Name].

Click here to nominate: [paste link]

Deadline: [date]
```

### Email Campaigns
```html
<a href="[paste link]" class="btn">
  Submit Your Nomination
</a>
```

### Website Integration
```html
<button onclick="window.location.href='[paste link]'">
  Nominate Now
</button>
```

## Files Modified
- `app/dashboard/awards/nominees/page.tsx` - Added button and functionality

## Related Files
- `app/(home)/nominate/[awardId]/page.tsx` - Public nomination page
- `app/api/public/awards/[id]/route.ts` - Public award API
- `PUBLIC_NOMINATION_LINK.md` - Complete documentation

## Future Enhancements

1. **QR Code Generation** - Generate QR code for the link
2. **Link Analytics** - Track clicks and submissions
3. **Social Share Buttons** - Pre-configured share buttons
4. **Link Shortener** - Integrate URL shortener
5. **Custom Slugs** - Allow custom URLs
6. **Email Template** - Pre-formatted email with link
7. **WhatsApp Direct Share** - One-click WhatsApp share
8. **Link Expiry** - Set expiration for nomination links
