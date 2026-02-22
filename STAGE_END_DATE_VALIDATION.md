# Stage End Date Validation Implementation

## Overview
Implemented logic to prevent voting when an award's stage end date/time has elapsed, even if the award's overall end date hasn't been reached yet.

## Changes Made

### File: `app/(home)/find-vote/page.tsx`

#### 1. Added `isAwardClosed()` Function
```typescript
const isAwardClosed = () => {
  if (!selectedAward) return false;

  const now = new Date();
  
  // If award has an active stage, check if stage has ended
  if (activeStage) {
    const stageEnd = new Date(activeStage.endDate);
    
    if (activeStage.endTime) {
      const [hours, minutes] = activeStage.endTime.split(':');
      stageEnd.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    }
    
    // If stage has ended, award is closed
    if (now > stageEnd) {
      return true;
    }
  }
  
  // Check if voting period has ended
  if (selectedAward.votingEndDate) {
    const endDate = new Date(selectedAward.votingEndDate);
    
    if (selectedAward.votingEndTime) {
      const [hours, minutes] = selectedAward.votingEndTime.split(':');
      endDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    }
    
    return now > endDate;
  }
  
  return false;
};
```

#### 2. Updated `handleNomineeClick()` Function
Added check for closed award before allowing voting:
```typescript
const handleNomineeClick = (nominee: Nominee) => {
  if (isAwardClosed()) {
    toast.error('This award is closed. Voting has ended.');
    return;
  }
  
  if (isVotingOpen()) {
    setSelectedNominee(nominee);
    setVotingModalOpen(true);
  } else {
    toast.error("Voting is not currently open for this award");
  }
};
```

#### 3. Updated Status Badge Display
Changed from static status to dynamic based on award state:
```typescript
{isAwardClosed() ? (
  <span className="bg-red-600 text-white px-4 py-1 rounded-full text-sm font-medium">
    CLOSED - Voting Has Ended
  </span>
) : isVotingOpen() ? (
  <span className="bg-green-600 text-white px-4 py-1 rounded-full text-sm font-medium">
    VOTING OPEN
  </span>
) : (
  <span className="bg-gray-600 text-white px-4 py-1 rounded-full text-sm font-medium">
    VOTING NOT STARTED
  </span>
)}
```

## Logic Flow

### Priority Order:
1. **Stage End Date** (if stage exists) - Highest priority
2. **Award Voting End Date** - Fallback if no stage

### Scenarios:

#### Scenario 1: Award with Active Stage
- Award End Date: Dec 31, 2024
- Stage End Date: Dec 15, 2024
- Current Date: Dec 20, 2024
- **Result:** CLOSED (stage ended, even though award end date not reached)

#### Scenario 2: Award without Stage
- Award End Date: Dec 31, 2024
- Current Date: Dec 20, 2024
- **Result:** VOTING OPEN (if within voting period)

#### Scenario 3: Stage Still Active
- Award End Date: Dec 31, 2024
- Stage End Date: Dec 25, 2024
- Current Date: Dec 20, 2024
- **Result:** VOTING OPEN (stage still active)

## User Experience

### When Award is Closed:
1. **Status Badge:** Shows "CLOSED - Voting Has Ended" in red
2. **Click on Nominee:** Toast error message: "This award is closed. Voting has ended."
3. **Voting Modal:** Does not open

### When Voting is Open:
1. **Status Badge:** Shows "VOTING OPEN" in green
2. **Click on Nominee:** Opens voting modal
3. **Can Submit Vote:** Normal voting flow

### When Voting Not Started:
1. **Status Badge:** Shows "VOTING NOT STARTED" in gray
2. **Click on Nominee:** Toast error: "Voting is not currently open for this award"

## Testing Checklist

- [ ] Award with stage - stage ended, award not ended → Shows CLOSED
- [ ] Award with stage - stage active → Shows VOTING OPEN
- [ ] Award without stage - voting period active → Shows VOTING OPEN
- [ ] Award without stage - voting period ended → Shows CLOSED
- [ ] Click nominee when closed → Shows error toast
- [ ] Click nominee when open → Opens voting modal
- [ ] Status badge updates correctly based on time

## Benefits

1. **Accurate Status:** Users see real-time status based on stage/award dates
2. **Prevents Invalid Votes:** Blocks voting attempts after stage ends
3. **Clear Messaging:** Users understand why they can't vote
4. **Stage Priority:** Respects stage-based award management
5. **Flexible:** Works with or without stages

## Notes

- Stage end date takes priority over award end date
- Time is considered (not just date)
- Toast notifications provide clear feedback
- Status badge is dynamic and updates based on current time
