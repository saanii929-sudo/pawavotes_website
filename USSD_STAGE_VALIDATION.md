# USSD Stage End Date Validation Implementation

## Overview
Implemented stage-based voting validation in the USSD voting system to prevent voting when a stage has ended, even if the award's overall end date hasn't been reached.

## Changes Made

### File: `app/api/ussd/vote/route.ts`

#### 1. Updated `showWelcome()` Function
Added stage validation when filtering active awards:

```typescript
async function showWelcome(session: any) {
  const awards = await Award.find({ status: 'published' })
    .select('name votingStartDate votingEndDate votingStartTime votingEndTime')
    .limit(10)
    .lean();

  const now = new Date();
  const activeAwards = [];

  for (const award of awards) {
    // Check if award has active stages
    const activeStage = await Stage.findOne({
      awardId: award._id,
      status: 'active',
      stageType: 'voting',
    }).select('startDate endDate startTime endTime').lean();

    let isActive = false;

    // If award has an active voting stage, check stage dates
    if (activeStage) {
      const stageStart = new Date(activeStage.startDate);
      const stageEnd = new Date(activeStage.endDate);

      // Add time if available
      if (activeStage.startTime) {
        const [hours, minutes] = activeStage.startTime.split(':');
        stageStart.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }

      if (activeStage.endTime) {
        const [hours, minutes] = activeStage.endTime.split(':');
        stageEnd.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }

      isActive = now >= stageStart && now <= stageEnd;
    } else {
      // Fallback to award's voting period if no active stage
      if (award.votingStartDate && award.votingEndDate) {
        const start = new Date(award.votingStartDate);
        const end = new Date(award.votingEndDate);

        // Add time if available
        if (award.votingStartTime) {
          const [hours, minutes] = award.votingStartTime.split(':');
          start.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }

        if (award.votingEndTime) {
          const [hours, minutes] = award.votingEndTime.split(':');
          end.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }

        isActive = now >= start && now <= end;
      }
    }

    if (isActive) {
      activeAwards.push(award);
    }
  }

  if (activeAwards.length === 0) {
    return { message: 'No awards are currently open for voting.', continueSession: false };
  }

  // Show menu with active awards only
  let menu = 'Welcome to PawaVotes!\nSelect an award to vote:\n\n';
  activeAwards.forEach((award, index) => {
    menu += `${index + 1}. ${award.name}\n`;
  });

  session.currentStep = 'select_award';
  session.data.awards = activeAwards;

  return { message: menu, continueSession: true };
}
```

#### 2. Updated `handleConfirmation()` Function
Added validation before processing payment to ensure voting is still open:

```typescript
async function handleConfirmation(session: any, userInput: string, phoneNumber: string) {
  if (userInput === '2') {
    session.isActive = false;
    return { message: 'Vote cancelled.', continueSession: false };
  }
  if (userInput !== '1') {
    return { message: 'Invalid selection.', continueSession: false };
  }

  try {
    // Validate that voting is still open before processing payment
    const award = await Award.findById(session.data.awardId)
      .select('votingStartDate votingEndDate votingStartTime votingEndTime')
      .lean();

    if (!award) {
      return { message: 'Award not found.', continueSession: false };
    }

    const now = new Date();
    let isVotingOpen = false;

    // Check if award has active voting stage
    const activeStage = await Stage.findOne({
      awardId: award._id,
      status: 'active',
      stageType: 'voting',
    }).select('startDate endDate startTime endTime').lean();

    if (activeStage) {
      const stageStart = new Date(activeStage.startDate);
      const stageEnd = new Date(activeStage.endDate);

      if (activeStage.startTime) {
        const [hours, minutes] = activeStage.startTime.split(':');
        stageStart.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }

      if (activeStage.endTime) {
        const [hours, minutes] = activeStage.endTime.split(':');
        stageEnd.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }

      isVotingOpen = now >= stageStart && now <= stageEnd;
    } else {
      // Fallback to award's voting period
      if (award.votingStartDate && award.votingEndDate) {
        const start = new Date(award.votingStartDate);
        const end = new Date(award.votingEndDate);

        if (award.votingStartTime) {
          const [hours, minutes] = award.votingStartTime.split(':');
          start.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }

        if (award.votingEndTime) {
          const [hours, minutes] = award.votingEndTime.split(':');
          end.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }

        isVotingOpen = now >= start && now <= end;
      }
    }

    if (!isVotingOpen) {
      session.isActive = false;
      return {
        message: 'Voting has closed for this award. Your vote was not processed.',
        continueSession: false,
      };
    }

    // Continue with payment processing...
  } catch (error: any) {
    return {
      message: 'An error occurred. Please try again.',
      continueSession: false,
    };
  }
}
```

## Logic Flow

### Priority Order:
1. **Active Voting Stage** (if exists) - Highest priority
2. **Award Voting Period** - Fallback if no active stage

### Validation Points:

#### 1. Award List (Welcome Screen)
- Only shows awards that are currently open for voting
- Checks stage dates first, then award dates
- Filters out closed awards before displaying menu

#### 2. Vote Confirmation
- Re-validates voting status before processing payment
- Prevents race conditions (voting closes while user is in session)
- Shows clear message if voting has closed

## USSD Flow Examples

### Scenario 1: Award with Active Stage (Stage Ended)
```
User: Dials *920*1234#
System: "No awards are currently open for voting."
[Session ends]
```

### Scenario 2: Award with Active Stage (Stage Active)
```
User: Dials *920*1234#
System: "Welcome to PawaVotes!
Select an award to vote:

1. Ghana Music Awards 2024"

User: 1
System: [Shows categories...]
```

### Scenario 3: Voting Closes During Session
```
User: Confirms vote
System: "Voting has closed for this award. Your vote was not processed."
[Session ends - no payment charged]
```

## Benefits

1. **Accurate Award List:** Only shows awards that are actually open for voting
2. **Stage Priority:** Respects stage-based award management
3. **Race Condition Protection:** Re-validates before payment
4. **Clear Messaging:** Users understand why awards aren't available
5. **No Wasted Payments:** Prevents charging users for invalid votes
6. **Consistent with Web:** Same logic as web voting platform

## Testing Checklist

- [ ] Award with active stage - stage active → Shows in list
- [ ] Award with active stage - stage ended → Not in list
- [ ] Award without stage - voting period active → Shows in list
- [ ] Award without stage - voting period ended → Not in list
- [ ] User confirms vote after stage ends → Shows closed message
- [ ] Multiple awards - only active ones shown
- [ ] Time component respected (not just date)

## Error Messages

### No Active Awards
```
"No awards are currently open for voting."
```

### Voting Closed During Session
```
"Voting has closed for this award. Your vote was not processed."
```

## Notes

- Stage validation happens at two points: award list and vote confirmation
- Time is considered (not just date) for accurate validation
- Dynamic import of Stage model to avoid circular dependencies
- Fallback to award dates if no active stage exists
- Session ends gracefully if voting closes
