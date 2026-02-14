# View Results Feature

## Overview
Added "View Results" / "View Leaderboard" buttons that appear when the organizer sets `showResults` to true. These buttons redirect users to the public leaderboard page showing live voting results.

## Implementation

### 1. Button Locations

#### Event Detail View (All Categories)
- **Location:** After award info, before category search
- **Button Text:** "View Full Leaderboard"
- **Icon:** Arrow right icon
- **Visibility:** Shows when `selectedAward.settings.showResults === true`

#### Category Nominees View (Specific Category)
- **Location:** Next to "Nominate Yourself" button
- **Button Text:** "View Leaderboard"
- **Icon:** Arrow right icon
- **Visibility:** Shows when `selectedAward.settings.showResults === true`

### 2. Navigation Flow

```
User on Find Vote Page
    ↓
Clicks on Award
    ↓
Event Detail View (sees all categories)
    ↓
[If showResults = true]
    ↓
"View Full Leaderboard" button appears
    ↓
Click button
    ↓
Redirects to /leaderboard?awardId={awardId}
    ↓
Shows live results for all categories
```

OR

```
User on Find Vote Page
    ↓
Clicks on Award → Clicks on Category
    ↓
Category Nominees View
    ↓
[If showResults = true]
    ↓
"View Leaderboard" button appears
    ↓
Click button
    ↓
Redirects to /leaderboard?awardId={awardId}
    ↓
Shows live results (can filter by category)
```

### 3. Code Changes

#### Added Router Import
```typescript
import { useRouter } from "next/navigation";

const PublicVotingPlatform = () => {
  const router = useRouter();
  // ...
}
```

#### Event Detail View Button
```typescript
{selectedAward?.settings?.showResults && (
  <div className="mb-6">
    <button
      onClick={() => router.push(`/leaderboard?awardId=${selectedAward._id}`)}
      className="bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg text-sm sm:text-base transition-colors flex items-center gap-2 font-medium"
    >
      <ChevronLeft size={18} className="rotate-180" />
      View Full Leaderboard
    </button>
  </div>
)}
```

#### Category Nominees View Button
```typescript
{selectedAward?.settings?.showResults && (
  <button
    onClick={() => router.push(`/leaderboard?awardId=${selectedAward._id}`)}
    className="bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
  >
    <ChevronLeft size={16} className="rotate-180" />
    View Leaderboard
  </button>
)}
```

## Leaderboard Page Features

### Existing Features
- ✅ Live voting results
- ✅ Category filtering
- ✅ Search by nominee name
- ✅ Grid and table view modes
- ✅ Export to CSV
- ✅ Rank indicators (🥇🥈🥉)
- ✅ Total votes and supporters count
- ✅ Responsive design

### URL Structure
```
/leaderboard?awardId={awardId}
```

### Data Displayed
- Nominee name and image
- Category
- Total votes
- Number of supporters
- Rank position
- Visual rank indicators for top 3

### View Modes

#### Grid View
- Card-based layout
- Shows nominee image
- Prominent vote count
- Supporter count
- Category badge
- Gradient backgrounds for top 3

#### Table View
- Tabular format
- Sortable columns
- Compact display
- Better for large datasets

## Admin Configuration

### How to Enable Results Display

In the award settings:
```typescript
award.settings = {
  showResults: true, // Set to true to show results
  allowPublicVoting: true
}
```

### When to Enable

**Enable showResults when:**
- ✅ Voting has started
- ✅ You want transparency
- ✅ You want to encourage more voting
- ✅ Results are ready to be public

**Keep showResults disabled when:**
- ❌ Voting hasn't started yet
- ❌ You want to keep results secret until announcement
- ❌ You're still verifying votes
- ❌ Award ceremony is upcoming

## User Experience

### Button Visibility Logic
```typescript
// Button only shows when:
selectedAward?.settings?.showResults === true

// This means:
// 1. Award must be selected
// 2. Award must have settings object
// 3. showResults must be explicitly true
```

### Button States
- **Normal:** Green background, white text
- **Hover:** Darker green background
- **Active:** Slightly darker, scale effect
- **Responsive:** Adapts padding and text size on mobile

### Navigation
- Clicking button uses Next.js router.push()
- Smooth client-side navigation
- Preserves award context via query parameter
- Back button on leaderboard returns to find-vote

## Responsive Design

### Mobile (< 640px)
- Smaller button padding
- Smaller icon size
- Shorter button text
- Stacked layout with other buttons

### Tablet (640px - 1024px)
- Medium button size
- Full button text
- Side-by-side with other buttons

### Desktop (> 1024px)
- Full button size
- All features visible
- Optimal spacing

## Testing Checklist

### Functional Tests
- [ ] Button appears when showResults is true
- [ ] Button hidden when showResults is false
- [ ] Button redirects to correct URL
- [ ] Award ID passed correctly in URL
- [ ] Leaderboard loads with correct data
- [ ] Back button returns to find-vote
- [ ] Works in both Event Detail and Category views

### Visual Tests
- [ ] Button styling matches design
- [ ] Icon displays correctly
- [ ] Hover effects work
- [ ] Responsive on mobile
- [ ] Accessible (keyboard navigation)

### Edge Cases
- [ ] Award with no votes yet
- [ ] Award with showResults undefined
- [ ] Invalid award ID
- [ ] Network errors
- [ ] Multiple rapid clicks

## Benefits

### For Users
- 🎯 **Transparency:** See live voting results
- 📊 **Engagement:** Track favorite nominees
- 🏆 **Competition:** See who's leading
- 📱 **Accessibility:** Easy access from any page

### For Organizers
- 📈 **Increased Voting:** Transparency encourages participation
- 🎪 **Excitement:** Live results build anticipation
- 📣 **Marketing:** Shareable leaderboard links
- 💡 **Insights:** See which categories are popular

## Future Enhancements

- [ ] Real-time updates (WebSocket)
- [ ] Social sharing buttons
- [ ] Embed leaderboard widget
- [ ] Historical data comparison
- [ ] Vote trends over time
- [ ] Category-specific leaderboard links
- [ ] PDF export of results
- [ ] Email results to participants

## Security Considerations

### Public Access
- Leaderboard is publicly accessible
- No authentication required
- Read-only access
- No sensitive data exposed

### Data Privacy
- Only shows public nominee information
- Vote counts aggregated
- No voter personal information
- No payment details

### Performance
- Results cached for performance
- Pagination for large datasets
- Optimized queries
- CDN for images

## Troubleshooting

### Button Not Appearing
**Check:**
- Award has settings object
- showResults is set to true (not undefined or false)
- Award is properly selected
- Component re-rendered after data load

### Redirect Not Working
**Check:**
- Router imported correctly
- Award ID is valid
- URL format is correct
- No JavaScript errors in console

### Leaderboard Empty
**Check:**
- Award has votes
- Award ID in URL is correct
- API endpoints working
- Network requests successful

### Wrong Data Displayed
**Check:**
- Award ID matches
- Category filter applied correctly
- Data fetched successfully
- Cache cleared if needed
