# Public Nomination Link Feature

## Overview
Award organizers can now share a direct public nomination link that allows users to submit nominations without having to navigate through the find-vote page.

## Public Nomination URL Format
```
https://pawavotes.com/nominate/[awardId]
```

Example:
```
https://pawavotes.com/nominate/69a0a476c5fff3d244d4158a
```

## Features

### For Users (Public)
1. **Direct Access** - Users can access the nomination page directly via the link
2. **Award Information** - See award details, banner, and description
3. **Category Selection** - Browse and select from available categories
4. **Easy Nomination** - Submit nominations with a simple form
5. **Status Indicators** - Clear indication if nominations are open or closed
6. **How It Works** - Built-in guide explaining the nomination process

### For Organizers
1. **Share Link** - Copy and share the nomination link via:
   - Social media
   - Email campaigns
   - WhatsApp groups
   - Website embeds
   - QR codes

2. **Automatic Validation** - The page automatically checks:
   - If nominations are enabled for the award
   - If current time is within nomination period
   - If categories are available

3. **Same Approval Process** - Nominations submitted via the public link go through the same review and approval process

## How to Get the Nomination Link

### Method 1: Manual Construction
1. Go to your award dashboard
2. Copy your award ID from the URL
3. Construct the link: `https://pawavotes.com/nominate/[YOUR_AWARD_ID]`

### Method 2: From Award Details (Future Enhancement)
A "Copy Nomination Link" button can be added to the award dashboard for easy access.

## Nomination Requirements

The public nomination page respects all award settings:
- **Nomination Type**: Free, Fixed Price, or Category-based pricing
- **Nomination Period**: Only accepts nominations during the configured period
- **Public Access**: Only works for awards with `allowPublicVoting` enabled
- **Categories**: Shows only published categories

## User Experience Flow

1. User clicks the nomination link
2. Page loads with award information and available categories
3. User selects a category
4. Nomination modal opens with the form
5. User fills in details (name, email, phone, bio, photo)
6. If paid nomination, user completes payment via mobile money
7. Nomination is submitted for organizer approval
8. User receives confirmation and email notification upon approval

## Technical Details

### Files Created
- `app/(home)/nominate/[awardId]/page.tsx` - Public nomination page
- `app/api/public/awards/[id]/route.ts` - Public API endpoint for award details

### API Endpoints Used
- `GET /api/public/awards/[id]` - Fetch award details
- `GET /api/public/categories?awardId=[id]` - Fetch categories
- `POST /api/public/nominations/submit` - Submit free nomination
- `POST /api/public/nominations/initialize` - Initialize paid nomination
- `POST /api/public/nominations/verify` - Verify paid nomination

### Security
- Only publicly accessible awards can be viewed
- Nomination period is validated server-side
- Payment verification is required for paid nominations
- All nominations require organizer approval

## Marketing Use Cases

1. **Social Media Campaigns**
   - Share on Facebook, Twitter, Instagram
   - Include in bio links
   - Use in social media ads

2. **Email Marketing**
   - Include in newsletters
   - Send to potential nominees
   - Add to email signatures

3. **WhatsApp/SMS**
   - Share in groups
   - Send to contacts
   - Include in broadcast messages

4. **Website Integration**
   - Add as a button on your website
   - Embed in blog posts
   - Include in event pages

5. **QR Codes**
   - Generate QR code for the link
   - Print on flyers and posters
   - Display at events

6. **Offline Promotion**
   - Print on business cards
   - Include in press releases
   - Add to promotional materials

## Future Enhancements

1. **Copy Link Button** - Add a button in the dashboard to easily copy the nomination link
2. **QR Code Generator** - Generate QR codes for the nomination link
3. **Link Analytics** - Track how many people visit and submit via the link
4. **Custom Slugs** - Allow custom URLs like `/nominate/ghana-music-awards`
5. **Embeddable Widget** - Create an iframe widget for embedding on external websites
6. **Social Share Buttons** - Pre-configured share buttons for social media
7. **Link Shortener** - Integrate with URL shortener for cleaner links

## Example Usage

```html
<!-- Add to your website -->
<a href="https://pawavotes.com/nominate/69a0a476c5fff3d244d4158a" 
   class="btn btn-primary">
  Submit Your Nomination
</a>
```

```markdown
<!-- Share on social media -->
🎉 Nominations are now open for the Ghana Music Awards 2024!

Submit your nomination here:
https://pawavotes.com/nominate/69a0a476c5fff3d244d4158a

Don't miss this opportunity! 🏆
```
