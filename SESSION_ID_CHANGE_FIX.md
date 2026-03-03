# Session ID Change Fix

## The Problem

Looking at your logs:
```
USSD Request - SessionID: 1641665931, Phone: 233509960632, Text: *928*121#, NewSession: true
USSD Request - SessionID: 1641665931, Phone: 233509960632, Text: 1, NewSession: false
USSD Request - SessionID: 4242083699, Phone: 233509960632, Text: *928*121#, NewSession: true
```

The sessionID is CHANGING between requests:
- First session: `1641665931`
- Second session: `4242083699`

This happens when:
1. User re-dials the USSD code (instead of continuing)
2. USSD gateway creates a new session
3. System can't find the old session with the new ID
4. User starts from scratch

## Root Cause

This is NOT a timeout issue. The USSD gateway (Arkesel) is generating a new sessionID when the user re-dials the code, even though they have an active session in progress.

### Why This Happens

**Scenario 1: User Re-dials**
- User is in the middle of voting
- User accidentally exits or presses back too many times
- User re-dials `*928*121#`
- Gateway creates NEW sessionID
- Old session is lost

**Scenario 2: Gateway Behavior**
- Some USSD gateways create new sessions after certain timeouts
- Or when the user navigates in certain ways
- This is gateway-specific behavior

## The Fix

Added session migration logic that:
1. When a new session is created (`newSession: true`)
2. Check if there's an existing ACTIVE session for the same phone number
3. If found, MIGRATE the old session data to the new sessionID
4. User continues where they left off

### Implementation

```typescript
// Check if there's an existing active session for this phone number
if (!session && newSession === true) {
  const existingSession = await UssdSession.findOne({
    phoneNumber,
    isActive: true,
    lastActivity: { $gte: new Date(Date.now() - SESSION_TIMEOUT_MS) }
  }).sort({ lastActivity: -1 });

  if (existingSession) {
    console.log(`Found existing active session, migrating to new sessionID`);
    // Migrate the existing session to the new sessionID
    existingSession.sessionId = sessionId;
    existingSession.lastActivity = new Date();
    existingSession.markModified('sessionId');
    existingSession.markModified('lastActivity');
    await existingSession.save();
    session = existingSession;
  }
}
```

## How It Works

### Before Fix
```
User: *928*121# → SessionID: 1641665931 → Select award
User: *928*121# → SessionID: 4242083699 → NEW SESSION, start over ❌
```

### After Fix
```
User: *928*121# → SessionID: 1641665931 → Select award
User: *928*121# → SessionID: 4242083699 → MIGRATE old session ✅
                                        → Continue from "Select award"
```

## Benefits

1. **User Experience**: Users can re-dial without losing progress
2. **Payment Safety**: Won't lose payment session during OTP entry
3. **Flexibility**: Handles gateway quirks automatically
4. **Timeout Protection**: Only migrates sessions that are still active (within 15 min)

## Edge Cases Handled

### Multiple Active Sessions
- Sorts by `lastActivity` descending
- Migrates the MOST RECENT active session
- Older sessions will expire naturally

### Expired Sessions
- Only migrates sessions within the timeout window
- Old sessions (>15 min) are ignored
- User starts fresh if session truly expired

### Concurrent Users
- Each phone number has its own session
- No conflict between different users
- SessionID is unique per phone number

## Testing

### Test Session Migration
1. Dial USSD code: `*928*121#`
2. Select an award (note the sessionID in logs)
3. Re-dial the code: `*928*121#`
4. Check logs for: "Found existing active session for phone..."
5. You should continue from where you left off

### Test Timeout
1. Dial USSD code
2. Wait 16+ minutes
3. Re-dial the code
4. Should start fresh (no migration)

### Test Payment Flow
1. Start voting process
2. Reach payment/OTP step
3. If you re-dial, session should migrate
4. Payment reference should be preserved

## Logs to Watch For

### Successful Migration
```
USSD Request - SessionID: 4242083699, Phone: 233509960632, Text: *928*121#, NewSession: true
Found existing active session for phone 233509960632, migrating to new sessionID 4242083699
Existing session found - Step: select_category, LastActivity: ...
```

### New Session (No Migration)
```
USSD Request - SessionID: 4242083699, Phone: 233509960632, Text: *928*121#, NewSession: true
Creating new session for 4242083699
handleUssdFlow - Step: welcome, SessionAge: 7ms
```

## Important Notes

### When Migration Happens
- Only when `newSession: true` is sent by gateway
- Only if an active session exists for that phone number
- Only if the old session is within timeout window

### When Migration Doesn't Happen
- If no previous session exists
- If previous session expired (>15 min)
- If previous session was marked inactive
- If `newSession: false` (normal continuation)

### Database Impact
- Updates the sessionId field of existing document
- No new document created
- Old sessionID is replaced with new one
- All session data (awards, votes, payment ref) preserved

## Alternative Solutions

If this doesn't fully solve the issue, consider:

### Option 1: Use Phone Number as Session Key
Instead of relying on gateway sessionID, use phone number as the primary key. This ensures continuity regardless of sessionID changes.

### Option 2: Session Resume Menu
When a new session is detected with an active old session, ask user:
```
Active session found!
1. Continue previous session
2. Start new session
```

### Option 3: Gateway Configuration
Check with Arkesel if there's a way to maintain sessionID consistency across re-dials.

## Monitoring

Check for frequent session migrations:
```javascript
// In MongoDB
db.ussdsessions.find({
  phoneNumber: "233509960632"
}).sort({ lastActivity: -1 })
```

If you see many sessions for the same phone number, users are re-dialing frequently. Consider:
- Improving menu clarity
- Adding "Press 0 to go back" reminders
- Simplifying the flow

## Summary

The fix allows users to re-dial the USSD code without losing their progress by automatically migrating their active session to the new sessionID provided by the gateway. This handles the common scenario where users accidentally exit or the gateway creates a new session.
