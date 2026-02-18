# Design Document: Multi-Stage Voting System

## Overview

This design document specifies the technical implementation of a multi-stage voting system that enables contests to run in multiple progressive rounds. The system automatically manages stage activation/closure, isolates votes per stage, processes contestant qualification based on configurable rules, and maintains permanent result snapshots.

The design extends the existing awards/voting platform by adding stage-based progression while maintaining backward compatibility with single-stage contests.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Stage Mgmt   │  │  Voting UI   │  │ Leaderboard  │      │
│  │     UI       │  │              │  │     UI       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Stage API    │  │  Vote API    │  │ Results API  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Stage        │  │ Qualification│  │ Leaderboard  │      │
│  │ Service      │  │ Processor    │  │ Service      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │ Contestant   │  │ Stage        │                        │
│  │ Service      │  │ Scheduler    │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                     Data Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Stage      │  │ StageContestant│ │ StageResult │      │
│  │   Model      │  │    Model      │  │   Model     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │   Vote       │  │  Nominee     │                        │
│  │   Model      │  │   Model      │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Backward Compatibility**: Existing single-stage contests continue to work without modification
2. **Data Isolation**: Votes and rankings are strictly isolated per stage
3. **Immutability**: Stage results become immutable after closure
4. **Idempotency**: Qualification processing can be safely retried
5. **Auditability**: All stage transitions and qualifications are logged

## Components and Interfaces

### 1. Enhanced Stage Model

**Purpose**: Extends the existing Stage model to include qualification rules and processing metadata.

**Schema Extensions**:
```typescript
interface IStage extends Document {
  // Existing fields
  name: string;
  awardId: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  order: number;
  stageType: 'nomination' | 'voting' | 'results';
  status: 'upcoming' | 'active' | 'completed';
  
  // NEW: Qualification fields
  qualificationRule: 'topN' | 'threshold' | 'manual';
  qualificationCount?: number;        // For topN rule
  qualificationThreshold?: number;    // For threshold rule
  qualificationProcessed: boolean;    // Prevents duplicate processing
  qualificationProcessedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}
```

**Validation Rules**:
- `qualificationCount` required when `qualificationRule === 'topN'`
- `qualificationThreshold` required when `qualificationRule === 'threshold'`
- `startDate` + `startTime` must be before `endDate` + `endTime`
- Stage periods cannot overlap within the same award

### 2. StageContestant Model

**Purpose**: Links contestants (nominees) to specific stages, controlling who can receive votes.

**Schema**:
```typescript
interface IStageContestant extends Document {
  stageId: string;              // Reference to Stage
  awardId: string;              // Reference to Award (for efficient queries)
  categoryId: string;           // Reference to Category
  nomineeId: string;            // Reference to Nominee
  addedBy: 'manual' | 'qualification' | 'initial';
  addedAt: Date;
  sourceStageId?: string;       // If qualified from previous stage
  createdAt: Date;
}
```

**Indexes**:
- Compound unique index: `(stageId, nomineeId)` - prevents duplicates
- Index: `(stageId, categoryId)` - for category-based queries
- Index: `(nomineeId)` - for contestant history queries

### 3. StageResult Model

**Purpose**: Stores immutable snapshots of final rankings when a stage closes.

**Schema**:
```typescript
interface IStageResult extends Document {
  stageId: string;
  awardId: string;
  categoryId: string;
  rankings: Array<{
    nomineeId: string;
    nomineeName: string;
    rank: number;
    voteCount: number;
    qualified: boolean;
    lastVoteAt?: Date;          // For tie-breaking
  }>;
  totalVotes: number;
  snapshotAt: Date;
  immutable: boolean;           // Always true after creation
  createdAt: Date;
}
```

**Indexes**:
- Index: `(stageId, categoryId)` - for result queries
- Index: `(awardId)` - for award-wide result queries

### 4. Enhanced Vote Model

**Purpose**: Extends existing Vote model to include stage reference.

**Schema Extensions**:
```typescript
interface IVote extends Document {
  // Existing fields
  awardId: string;
  categoryId: string;
  nomineeId: string;
  voterEmail: string;
  voterPhone: string;
  numberOfVotes: number;
  amount: number;
  paymentReference: string;
  paymentMethod: string;
  paymentStatus: 'pending' | 'completed' | 'failed';
  ipAddress?: string;
  userAgent?: string;
  
  // NEW: Stage reference
  stageId?: string;             // Optional for backward compatibility
  
  createdAt: Date;
  updatedAt: Date;
}
```

**Migration Strategy**:
- Existing votes without `stageId` are treated as legacy single-stage votes
- New votes must include `stageId` when the award has stages

### 5. Stage Scheduler Service

**Purpose**: Automatically activates and closes stages based on scheduled times.

**Interface**:
```typescript
class StageScheduler {
  // Check and update stage statuses
  async processStageTransitions(): Promise<void>
  
  // Activate stages that have reached start time
  async activateStages(): Promise<Stage[]>
  
  // Close stages that have reached end time
  async closeStages(): Promise<Stage[]>
  
  // Validate only one active stage per award
  async validateSingleActiveStage(awardId: string): Promise<boolean>
}
```

**Execution**:
- Runs as a cron job every 1 minute
- Processes all awards with stages
- Logs all transitions for audit

### 6. Qualification Processor Service

**Purpose**: Processes qualification rules and moves contestants to the next stage.

**Interface**:
```typescript
class QualificationProcessor {
  // Main entry point - processes qualification for a closed stage
  async processStageQualification(stageId: string): Promise<QualificationResult>
  
  // Apply Top N rule
  async processTopN(stage: Stage, count: number): Promise<Contestant[]>
  
  // Apply Threshold rule
  async processThreshold(stage: Stage, threshold: number): Promise<Contestant[]>
  
  // Handle tie-breaking
  async resolveTies(contestants: Contestant[], cutoffRank: number): Promise<Contestant[]>
  
  // Add qualified contestants to next stage
  async addContestantsToNextStage(contestants: Contestant[], nextStageId: string): Promise<void>
  
  // Mark qualification as processed (idempotent)
  async markQualificationProcessed(stageId: string): Promise<void>
}
```

**Tie-Breaking Logic**:
1. Compare vote counts (primary)
2. If tied, compare timestamp of last vote (earlier is better)
3. If still tied, assign shared rank and qualify all

### 7. Contestant Service

**Purpose**: Manages contestant-stage relationships.

**Interface**:
```typescript
class ContestantService {
  // Add contestants to a stage
  async addContestantsToStage(stageId: string, nomineeIds: string[], addedBy: string): Promise<void>
  
  // Remove contestant from stage
  async removeContestantFromStage(stageId: string, nomineeId: string): Promise<void>
  
  // Get contestants for a stage
  async getStageContestants(stageId: string, categoryId?: string): Promise<Nominee[]>
  
  // Check if contestant is in stage
  async isContestantInStage(stageId: string, nomineeId: string): Promise<boolean>
  
  // Get contestant's stage history
  async getContestantStageHistory(nomineeId: string): Promise<StageContestant[]>
}
```

### 8. Leaderboard Service

**Purpose**: Generates stage-specific leaderboards and caches results.

**Interface**:
```typescript
class LeaderboardService {
  // Get real-time leaderboard for active stage
  async getStageLeaderboard(stageId: string, categoryId?: string): Promise<LeaderboardEntry[]>
  
  // Get historical leaderboard from snapshot
  async getHistoricalLeaderboard(stageId: string, categoryId?: string): Promise<LeaderboardEntry[]>
  
  // Invalidate cache after vote
  async invalidateCache(stageId: string, categoryId: string): Promise<void>
  
  // Create result snapshot
  async createResultSnapshot(stageId: string): Promise<StageResult[]>
}
```

**Caching Strategy**:
- Use Redis for active stage leaderboards
- Cache TTL: 30 seconds
- Invalidate on vote creation
- Historical results cached indefinitely

## Data Models

### Stage Model (Enhanced)

```typescript
const StageSchema = new Schema({
  name: { type: String, required: true, trim: true },
  awardId: { type: Schema.Types.ObjectId, required: true, ref: 'Award', index: true },
  description: String,
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  order: { type: Number, required: true },
  stageType: { 
    type: String, 
    enum: ['nomination', 'voting', 'results'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['upcoming', 'active', 'completed'], 
    default: 'upcoming',
    index: true
  },
  qualificationRule: {
    type: String,
    enum: ['topN', 'threshold', 'manual'],
    required: true,
    default: 'manual'
  },
  qualificationCount: { type: Number, min: 1 },
  qualificationThreshold: { type: Number, min: 0 },
  qualificationProcessed: { type: Boolean, default: false },
  qualificationProcessedAt: Date,
}, { timestamps: true });

// Compound index for overlap detection
StageSchema.index({ awardId: 1, startDate: 1, endDate: 1 });
```

### StageContestant Model

```typescript
const StageContestantSchema = new Schema({
  stageId: { type: Schema.Types.ObjectId, required: true, ref: 'Stage', index: true },
  awardId: { type: Schema.Types.ObjectId, required: true, ref: 'Award', index: true },
  categoryId: { type: Schema.Types.ObjectId, required: true, ref: 'Category', index: true },
  nomineeId: { type: Schema.Types.ObjectId, required: true, ref: 'Nominee', index: true },
  addedBy: { 
    type: String, 
    enum: ['manual', 'qualification', 'initial'], 
    required: true 
  },
  addedAt: { type: Date, default: Date.now },
  sourceStageId: { type: Schema.Types.ObjectId, ref: 'Stage' },
}, { timestamps: true });

// Unique constraint: one contestant per stage
StageContestantSchema.index({ stageId: 1, nomineeId: 1 }, { unique: true });
```

### StageResult Model

```typescript
const StageResultSchema = new Schema({
  stageId: { type: Schema.Types.ObjectId, required: true, ref: 'Stage', index: true },
  awardId: { type: Schema.Types.ObjectId, required: true, ref: 'Award', index: true },
  categoryId: { type: Schema.Types.ObjectId, required: true, ref: 'Category', index: true },
  rankings: [{
    nomineeId: { type: Schema.Types.ObjectId, required: true, ref: 'Nominee' },
    nomineeName: { type: String, required: true },
    rank: { type: Number, required: true },
    voteCount: { type: Number, required: true },
    qualified: { type: Boolean, default: false },
    lastVoteAt: Date,
  }],
  totalVotes: { type: Number, required: true },
  snapshotAt: { type: Date, default: Date.now },
  immutable: { type: Boolean, default: true },
}, { timestamps: true });

// Compound index for result queries
StageResultSchema.index({ stageId: 1, categoryId: 1 });
```

### Vote Model (Enhanced)

```typescript
// Add to existing VoteSchema
VoteSchema.add({
  stageId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Stage', 
    index: true,
    required: false  // Optional for backward compatibility
  }
});

// Compound index for stage-specific vote queries
VoteSchema.index({ stageId: 1, categoryId: 1, nomineeId: 1 });
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Stage Isolation

*For any* two different stages in the same award, votes recorded in one stage should never affect the leaderboard or rankings of the other stage.

**Validates: Requirements 3.1, 3.2, 5.1, 5.2**

### Property 2: Single Active Stage

*For any* award at any point in time, there should be at most one stage with status 'active'.

**Validates: Requirements 4.3, 9.1, 9.2**

### Property 3: Vote Stage Validation

*For any* vote submission, if the target stage status is not 'active', then the vote should be rejected.

**Validates: Requirements 3.2, 3.3, 8.2, 8.3**

### Property 4: Contestant Eligibility

*For any* vote submission, if the target nominee is not in the active stage's contestant list, then the vote should be rejected.

**Validates: Requirements 2.5, 3.4, 3.5**

### Property 5: No Duplicate Contestants

*For any* stage, each nominee should appear at most once in the stage's contestant list.

**Validates: Requirements 2.3, 2.4**

### Property 6: Qualification Idempotency

*For any* closed stage, running the qualification processor multiple times should produce the same set of qualified contestants in the next stage (no duplicates created).

**Validates: Requirements 6.8**

### Property 7: Top N Qualification

*For any* stage with qualificationRule='topN' and qualificationCount=N, after qualification processing, the next stage should contain exactly the N contestants with the highest vote counts (or more if there are ties at the boundary).

**Validates: Requirements 6.2, 10.1, 10.5**

### Property 8: Threshold Qualification

*For any* stage with qualificationRule='threshold' and qualificationThreshold=T, after qualification processing, the next stage should contain all and only contestants with vote counts >= T.

**Validates: Requirements 6.3**

### Property 9: Result Immutability

*For any* stage result snapshot, once created, the rankings and vote counts should never change.

**Validates: Requirements 7.2, 7.4**

### Property 10: Stage Overlap Prevention

*For any* two stages in the same award, their active periods (startDate+startTime to endDate+endTime) should not overlap.

**Validates: Requirements 1.7, 1.8, 9.1, 9.2, 9.3**

### Property 11: Automatic Stage Activation

*For any* stage where current time >= startDate+startTime and status='upcoming', the stage should be automatically activated within 1 minute.

**Validates: Requirements 4.1, 4.7**

### Property 12: Automatic Stage Closure

*For any* stage where current time >= endDate+endTime and status='active', the stage should be automatically closed within 1 minute.

**Validates: Requirements 4.2, 4.7**

### Property 13: Vote Payment Validation

*For any* vote, if the payment is confirmed after the stage has closed, then the vote should be rejected.

**Validates: Requirements 8.2, 8.3**

### Property 14: Payment Reference Uniqueness

*For any* two votes, they should never have the same paymentReference value.

**Validates: Requirements 8.4, 8.5**

### Property 15: Leaderboard Consistency

*For any* completed stage, the historical leaderboard should exactly match the rankings stored in the stage result snapshot.

**Validates: Requirements 5.5, 7.6, 7.7**

### Property 16: Tie-Breaking Determinism

*For any* set of contestants with identical vote counts at the qualification boundary, applying the tie-breaking rule multiple times should produce the same qualification decision.

**Validates: Requirements 10.2, 10.3, 10.6**

### Property 17: Vote Preservation

*For any* contestant removed from a stage, all votes previously cast for that contestant in that stage should remain in the database unchanged.

**Validates: Requirements 2.6**

### Property 18: Zero Vote Start

*For any* newly activated stage, all contestants should start with zero votes in that stage (votes from previous stages do not carry over).

**Validates: Requirements 5.2**

## Error Handling

### Validation Errors

**Stage Creation Errors**:
- `STAGE_OVERLAP`: Stage period overlaps with another stage in the same award
- `INVALID_QUALIFICATION_RULE`: Missing required qualification parameters
- `INVALID_DATE_RANGE`: End date/time is before start date/time
- `MISSING_AWARD`: Award ID does not exist

**Voting Errors**:
- `STAGE_NOT_ACTIVE`: Vote submitted when stage is not active
- `CONTESTANT_NOT_IN_STAGE`: Nominee is not eligible in the current stage
- `PAYMENT_AFTER_CLOSURE`: Payment confirmed after stage closed
- `DUPLICATE_PAYMENT_REFERENCE`: Payment reference already used

**Contestant Management Errors**:
- `DUPLICATE_CONTESTANT`: Contestant already exists in the stage
- `INVALID_STAGE_FOR_MANUAL_ADD`: Cannot manually add to non-first stage without manual qualification

### System Errors

**Scheduler Errors**:
- `MULTIPLE_ACTIVE_STAGES`: More than one active stage detected for an award
- `ACTIVATION_FAILED`: Stage activation failed due to system error
- `CLOSURE_FAILED`: Stage closure failed due to system error

**Qualification Errors**:
- `QUALIFICATION_ALREADY_PROCESSED`: Attempting to process qualification twice
- `NO_NEXT_STAGE`: No next stage exists for qualified contestants
- `QUALIFICATION_FAILED`: Qualification processing encountered an error

### Error Response Format

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
```

## Testing Strategy

### Unit Tests

**Stage Model Tests**:
- Validate qualification rule requirements
- Test date/time validation
- Test status transitions

**StageContestant Model Tests**:
- Test unique constraint enforcement
- Test cascade deletion behavior

**Vote Model Tests**:
- Test stage reference validation
- Test payment reference uniqueness

### Property-Based Tests

**Configuration**: All property tests run with minimum 100 iterations using fast-check library.

**Test 1: Stage Isolation Property**
- **Property**: Property 1 - Stage Isolation
- **Validates**: Requirements 3.1, 3.2, 5.1, 5.2
- **Strategy**: Generate random stages and votes, verify leaderboards are independent

**Test 2: Single Active Stage Property**
- **Property**: Property 2 - Single Active Stage
- **Validates**: Requirements 4.3, 9.1, 9.2
- **Strategy**: Generate random stage activation sequences, verify only one active at a time

**Test 3: Vote Stage Validation Property**
- **Property**: Property 3 - Vote Stage Validation
- **Validates**: Requirements 3.2, 3.3, 8.2, 8.3
- **Strategy**: Generate random votes with various stage statuses, verify rejections

**Test 4: Contestant Eligibility Property**
- **Property**: Property 4 - Contestant Eligibility
- **Validates**: Requirements 2.5, 3.4, 3.5
- **Strategy**: Generate random votes for nominees not in stage, verify rejections

**Test 5: No Duplicate Contestants Property**
- **Property**: Property 5 - No Duplicate Contestants
- **Validates**: Requirements 2.3, 2.4
- **Strategy**: Attempt to add same contestant multiple times, verify uniqueness

**Test 6: Qualification Idempotency Property**
- **Property**: Property 6 - Qualification Idempotency
- **Validates**: Requirements 6.8
- **Strategy**: Run qualification processor multiple times, verify same results

**Test 7: Top N Qualification Property**
- **Property**: Property 7 - Top N Qualification
- **Validates**: Requirements 6.2, 10.1, 10.5
- **Strategy**: Generate random vote distributions, verify top N are qualified

**Test 8: Threshold Qualification Property**
- **Property**: Property 8 - Threshold Qualification
- **Validates**: Requirements 6.3
- **Strategy**: Generate random vote distributions, verify threshold logic

**Test 9: Result Immutability Property**
- **Property**: Property 9 - Result Immutability
- **Validates**: Requirements 7.2, 7.4
- **Strategy**: Attempt to modify result snapshots, verify rejections

**Test 10: Stage Overlap Prevention Property**
- **Property**: Property 10 - Stage Overlap Prevention
- **Validates**: Requirements 1.7, 1.8, 9.1, 9.2, 9.3
- **Strategy**: Generate random stage periods, verify overlap detection

**Test 11: Payment Reference Uniqueness Property**
- **Property**: Property 14 - Payment Reference Uniqueness
- **Validates**: Requirements 8.4, 8.5
- **Strategy**: Generate random votes, verify payment reference uniqueness

**Test 12: Leaderboard Consistency Property**
- **Property**: Property 15 - Leaderboard Consistency
- **Validates**: Requirements 5.5, 7.6, 7.7
- **Strategy**: Compare live leaderboard with snapshot, verify exact match

**Test 13: Vote Preservation Property**
- **Property**: Property 17 - Vote Preservation
- **Validates**: Requirements 2.6
- **Strategy**: Remove contestants, verify votes remain unchanged

**Test 14: Zero Vote Start Property**
- **Property**: Property 18 - Zero Vote Start
- **Validates**: Requirements 5.2
- **Strategy**: Activate new stage, verify all contestants have zero votes

### Integration Tests

**End-to-End Stage Flow**:
1. Create multi-stage contest
2. Add contestants to first stage
3. Submit votes
4. Trigger stage closure
5. Verify qualification processing
6. Verify next stage activation
7. Verify result snapshots

**Scheduler Integration**:
1. Create stages with specific times
2. Advance system time
3. Verify automatic activation/closure
4. Verify qualification triggers

**Payment Integration**:
1. Submit vote with payment
2. Confirm payment after stage closes
3. Verify vote rejection and refund

## Implementation Notes

### Migration Strategy

**Phase 1: Database Schema**
1. Add new fields to Stage model
2. Create StageContestant model
3. Create StageResult model
4. Add stageId to Vote model (optional field)
5. Create database indexes

**Phase 2: Core Services**
1. Implement ContestantService
2. Implement enhanced StageService
3. Implement LeaderboardService with stage filtering
4. Update VoteService to validate stage

**Phase 3: Automation**
1. Implement StageScheduler
2. Implement QualificationProcessor
3. Set up cron job for scheduler

**Phase 4: API Layer**
1. Update stage creation endpoint
2. Add contestant management endpoints
3. Update voting endpoint with stage validation
4. Add stage-specific leaderboard endpoint
5. Add results export endpoint

**Phase 5: UI Updates**
1. Enhance stage creation form
2. Add contestant management UI
3. Update leaderboard to show stage filter
4. Add historical results viewer

### Performance Considerations

**Caching**:
- Cache active stage per award (Redis, TTL: 1 minute)
- Cache stage leaderboards (Redis, TTL: 30 seconds)
- Cache stage contestants (Redis, TTL: 5 minutes)

**Database Optimization**:
- Use compound indexes for stage-vote queries
- Use aggregation pipelines for leaderboard generation
- Batch contestant additions for qualification

**Scheduler Optimization**:
- Process only awards with stages
- Use database queries to find stages needing transition
- Limit concurrent processing to prevent race conditions

### Security Considerations

**Access Control**:
- Only organizers can create/edit stages
- Only organizers can manually add/remove contestants
- Voters cannot see qualification rules before stage closes

**Data Integrity**:
- Use database transactions for qualification processing
- Lock stages during qualification to prevent concurrent modifications
- Validate payment references before creating votes

**Audit Logging**:
- Log all stage transitions
- Log all qualification decisions
- Log all contestant additions/removals
- Log all vote rejections with reasons

## API Endpoints

### Stage Management

**POST /api/stages**
- Create new stage with qualification rules
- Body: `{ name, awardId, startDate, endDate, startTime, endTime, stageType, order, qualificationRule, qualificationCount?, qualificationThreshold? }`

**PUT /api/stages/:id**
- Update stage (restricted when active/completed)
- Body: Same as POST

**GET /api/stages?awardId=:id**
- Get all stages for an award
- Returns: Array of stages sorted by order

**GET /api/stages/:id/active**
- Get currently active stage for an award
- Returns: Active stage or null

### Contestant Management

**POST /api/stages/:id/contestants**
- Add contestants to a stage
- Body: `{ nomineeIds: string[] }`

**DELETE /api/stages/:stageId/contestants/:nomineeId**
- Remove contestant from stage

**GET /api/stages/:id/contestants**
- Get all contestants in a stage
- Query: `?categoryId=:id` (optional)

### Voting

**POST /api/votes** (Enhanced)
- Submit vote with stage validation
- Body: `{ awardId, categoryId, nomineeId, stageId, ... }`

### Leaderboard

**GET /api/leaderboard/:awardId** (Enhanced)
- Get leaderboard for specific stage
- Query: `?stageId=:id&categoryId=:id`

**GET /api/leaderboard/:awardId/history**
- Get historical leaderboards for all completed stages

### Results

**GET /api/stages/:id/results**
- Get result snapshot for a completed stage
- Query: `?categoryId=:id` (optional)

**GET /api/stages/:id/results/export**
- Export results as CSV/PDF

### Admin

**POST /api/stages/:id/process-qualification**
- Manually trigger qualification processing (admin only)

**POST /api/stages/:id/activate**
- Manually activate a stage (admin only, for testing)

**POST /api/stages/:id/close**
- Manually close a stage (admin only, for testing)

## Deployment Considerations

**Environment Variables**:
- `STAGE_SCHEDULER_INTERVAL`: Scheduler run interval (default: 60000ms)
- `LEADERBOARD_CACHE_TTL`: Leaderboard cache duration (default: 30s)
- `QUALIFICATION_RETRY_LIMIT`: Max retries for failed qualification (default: 3)

**Monitoring**:
- Track scheduler execution time
- Alert on qualification failures
- Monitor cache hit rates
- Track stage transition delays

**Backup Strategy**:
- Backup database before qualification processing
- Store qualification logs for 90 days
- Archive completed stage results indefinitely

## Future Enhancements

1. **Advanced Qualification Rules**:
   - Percentage-based qualification (top 20%)
   - Combined rules (top N AND threshold)
   - Category-specific qualification rules

2. **Stage Templates**:
   - Predefined stage sequences (Prelims → Semis → Finals)
   - Clone stage configuration across awards

3. **Real-Time Notifications**:
   - Notify contestants when they qualify
   - Notify organizers of stage transitions
   - Push notifications for stage activation

4. **Analytics Dashboard**:
   - Stage-by-stage performance metrics
   - Contestant progression visualization
   - Vote distribution analysis per stage

5. **Social Features**:
   - Share stage results on social media
   - Stage-specific voting campaigns
   - Contestant progress badges
