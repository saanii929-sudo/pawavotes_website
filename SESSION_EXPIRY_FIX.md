# Session Expiry Fix

## The Problem
Users were getting "Session expired. Please dial again to continue" when trying to select an award or navigate through the USSD menu.

## Root Cause
There were TWO timeout mechanisms working against each other:

### 1. MongoDB TTL Index (Database Level)
```typescript
// In models/UssdSession.ts
UssdSessionSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 300 });
```
This automatically DELETES session documents from MongoDB after 300 seconds (5 minutes) of inactivity.

### 2. Application Timeout Check (Code Level)
```typescript
// In app/api/ussd/vote/route.ts
const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
```
This checks if the session is too old and returns an expiry message.

## The Issue
The MongoDB TTL index was the main culprit:
- User starts USSD session
- User takes time to read menus and make selections
- If more than 5 minutes pass, MongoDB automatically DELETES the session document
- Next USSD request tries to find the session → NOT FOUND
- System creates a NEW session, user starts from beginning

5 minutes is too short for USSD interactions where users:
- Read through multiple pages of awards/categories/nominees
- Take time to decide who to vote for
- May get interrupted briefly

## The Fix

### Increased Timeout to 15 Minutes

**Updated UssdSession Model:**
```typescript
// Auto-expire sessions after 15 minutes of inactivity
UssdSessionSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 900 });
```

**Updated Application Constant:**
```typescript
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
```

### Added Better Logging
```typescript
console.log(`handleUssdFlow - Step: ${step}, SessionAge: ${sessionAge}ms`);
console.log(`LastActivity: ${session.lastActivity}, Now: ${new Date(now)}`);
```

This helps debug timeout issues in the future.

## Important Notes

### MongoDB TTL Index Update
After changing the TTL index, you need to:

1. **Drop the old index** (if it exists):
```javascript
// Connect to MongoDB
use pawavotes

// Drop the old TTL index
db.ussdsessions.dropIndex("lastActivity_1")

// The new index will be created automatically when the app restarts
```

2. **Or wait for it to update**: MongoDB will eventually update the index, but it's faster to drop and recreate.

### Why 15 Minutes?
- Gives users enough time to navigate menus
- Allows for brief interruptions (phone calls, etc.)
- Still cleans up abandoned sessions reasonably quickly
- Prevents database bloat from old sessions

### Session Activity Updates
Every USSD request updates `lastActivity`:
```typescript
session.lastActivity = new Date();
session.markModified('lastActivity');
```

This means:
- Active users won't timeout
- Only truly abandoned sessions expire
- Each interaction resets the 15-minute timer

## Testing

### Test Normal Flow
1. Dial USSD code
2. Navigate through menus slowly
3. Take 2-3 minutes between selections
4. Should work without expiry

### Test Timeout
1. Dial USSD code
2. Wait 16+ minutes without any input
3. Try to continue
4. Should get "Session expired" message

### Check Logs
Look for:
```
handleUssdFlow - Step: select_award, SessionAge: 1234ms (1.2s), Timeout: 900000ms
```

If SessionAge is close to Timeout, user is approaching expiry.

## Adjusting Timeout Further

If 15 minutes is still too short (or too long), adjust both values:

```typescript
// In models/UssdSession.ts
UssdSessionSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 1800 }); // 30 minutes

// In app/api/ussd/vote/route.ts
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
```

**Remember**: Both values should match!

## Monitoring

Check MongoDB for session count:
```javascript
db.ussdsessions.count()
```

Check old sessions:
```javascript
db.ussdsessions.find({
  lastActivity: { $lt: new Date(Date.now() - 15*60*1000) }
}).count()
```

These should be automatically cleaned up by the TTL index.

## Restart Required

After making these changes:
1. Stop your application
2. Optionally drop the old MongoDB index
3. Restart your application
4. The new TTL index will be created automatically
5. Test the USSD flow

## Summary
- Increased session timeout from 5 to 15 minutes
- Updated both MongoDB TTL index and application constant
- Added better logging for debugging
- Sessions now give users adequate time to complete voting
