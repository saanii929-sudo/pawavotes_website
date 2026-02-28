# Search Input Focus Issue - Find Vote Page

## Problem
The search inputs on the find-vote page lose focus after typing each character, requiring users to click the input field again before typing the next character.

## Root Cause
The `AwardCountdown` component has a `setInterval` that updates every second (line 147 in `components/AwardCountdown.tsx`). This causes the parent component to re-render every second. Since the view components (`EventDetailView`, `CategoryNomineesView`) are defined as functions inside the parent component, they get recreated on every render. React treats these as "new" components and unmounts/remounts them, causing the input fields to lose focus.

## Attempted Solutions
1. ✗ Added `React.memo` to view components - Didn't work because they have many dependencies
2. ✗ Added `key` props to inputs - Didn't help
3. ✗ Created separate memoized search input components - Still affected by parent re-renders
4. ✗ Added refs and `suppressHydrationWarning` - No effect

## Recommended Solutions

### Option 1: Remove Countdown from Search Views (Quick Fix)
Comment out the `<AwardCountdown />` component in `EventDetailView` and `CategoryNomineesView`. The countdown updates every second and isn't critical for the search functionality.

### Option 2: Move View Components Outside (Proper Fix)
Extract `EventDetailView`, `CategoryNomineesView`, and `ResultsView` as separate components outside of `PublicVotingPlatform`. Pass all required state as props. This prevents them from being recreated on every render.

### Option 3: Use Global State Management
Implement a state management solution (like Zustand or Redux) to prevent unnecessary re-renders of the parent component.

### Option 4: Optimize Countdown Component
Modify `AwardCountdown` to only update when necessary (e.g., every minute instead of every second, or only update its own internal state without triggering parent re-renders).

## Temporary Workaround
Users can:
1. Type their search query in a text editor
2. Copy and paste it into the search field
3. Or type quickly before the next second tick

## Files Involved
- `app/(home)/find-vote/page.tsx` - Main component with search inputs
- `components/AwardCountdown.tsx` - Countdown component causing re-renders

## Implementation Priority
**HIGH** - This significantly impacts user experience and makes the search feature nearly unusable.
