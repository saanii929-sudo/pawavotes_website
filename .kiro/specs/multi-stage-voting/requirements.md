# Requirements Document: Multi-Stage Voting System

## Introduction

This document specifies the requirements for implementing a multi-stage voting system that allows contests to run in multiple rounds. Contestants progress through stages based on qualification rules, with votes isolated per stage and automatic stage activation/closure based on scheduling.

## Glossary

- **Stage**: A distinct phase in a contest (e.g., Round 1, Semi-Finals, Finals) with its own start/end time, contestants, and votes
- **Contest**: An award or election event that contains multiple stages
- **Contestant**: A nominee or candidate who can receive votes within a stage
- **Qualification_Rule**: The method used to determine which contestants advance to the next stage (Top N, Threshold, or Manual)
- **Stage_Contestant**: A link between a contestant and a stage, indicating the contestant is eligible to receive votes in that stage
- **Stage_Result**: A permanent snapshot of final rankings and vote counts when a stage closes
- **Active_Stage**: A stage that is currently accepting votes (status = 'active')
- **Vote_Reference**: A unique identifier linking a vote to a specific stage
- **Leaderboard**: A real-time ranking of contestants based on vote counts for a specific stage
- **Qualification_Processor**: The system component that evaluates qualification rules and moves contestants to the next stage

## Requirements

### Requirement 1: Stage Creation with Qualification Rules

**User Story:** As an organizer, I want to create multiple stages with qualification rules, so that voting can occur in structured rounds and contestants can progress automatically.

#### Acceptance Criteria

1. WHEN an organizer creates a stage, THE System SHALL accept stage name, description, start date/time, end date/time, stage type, and order
2. WHEN an organizer creates a stage, THE System SHALL allow selection of qualification rule type (Top N, Threshold, or Manual)
3. WHERE qualification rule is "Top N", THE System SHALL require the organizer to specify the number of contestants to qualify
4. WHERE qualification rule is "Threshold", THE System SHALL require the organizer to specify the minimum vote count required to qualify
5. WHERE qualification rule is "Manual", THE System SHALL not require additional parameters
6. WHEN an organizer creates a stage, THE System SHALL validate that the stage belongs to exactly one contest
7. WHEN an organizer creates a stage with overlapping dates, THE System SHALL reject the creation and return an error message
8. WHEN validating stage overlap, THE System SHALL check that no other stage in the same contest has an active period that overlaps with the new stage

### Requirement 2: Contestant Management Per Stage

**User Story:** As an organizer, I want to control which contestants participate in each stage, so that only qualified participants can receive votes.

#### Acceptance Criteria

1. WHEN an organizer adds contestants to the first stage, THE System SHALL allow manual selection from all available contestants in the contest
2. WHEN an organizer attempts to add a contestant to a later stage manually, THE System SHALL allow the addition only if manual qualification is enabled
3. WHEN a contestant is added to a stage, THE System SHALL validate that the contestant does not already exist in that stage
4. IF a contestant already exists in a stage, THEN THE System SHALL reject the addition and return an error message
5. WHEN an organizer removes a contestant from a stage, THE System SHALL prevent that contestant from receiving new votes in that stage
6. WHEN a contestant is removed from a stage, THE System SHALL preserve all existing votes for that contestant in that stage
7. WHEN an organizer views contestants for a stage, THE System SHALL display all contestants currently eligible to receive votes in that stage

### Requirement 3: Stage-Specific Voting

**User Story:** As a voter, I want my vote to apply only to the current round, so that the competition remains fair and transparent.

#### Acceptance Criteria

1. WHEN a voter submits a vote, THE System SHALL attach the vote to the currently active stage
2. WHEN a voter attempts to vote, THE System SHALL validate that the target stage status is 'active'
3. IF the stage status is 'upcoming' or 'completed', THEN THE System SHALL reject the vote and return an error message
4. WHEN a voter submits a vote, THE System SHALL validate that the contestant is eligible in the active stage
5. IF the contestant is not in the active stage, THEN THE System SHALL reject the vote and return an error message
6. WHEN processing bulk votes, THE System SHALL apply the same stage validation rules as single votes
7. WHEN a vote is successfully recorded, THE System SHALL include the stage name in the vote receipt

### Requirement 4: Automatic Stage Activation and Closure

**User Story:** As the system, I want stages to open and close automatically based on scheduled times, so that organizers do not need to manually control timing.

#### Acceptance Criteria

1. WHEN the current date/time reaches a stage's start date/time, THE System SHALL automatically update the stage status to 'active'
2. WHEN the current date/time reaches a stage's end date/time, THE System SHALL automatically update the stage status to 'completed'
3. WHEN a stage becomes active, THE System SHALL validate that no other stage in the same contest is currently active
4. IF another stage is already active, THEN THE System SHALL log an error and not activate the new stage
5. WHEN a stage is closed, THE System SHALL immediately reject all new vote submissions for that stage
6. WHEN a stage is closed, THE System SHALL freeze the leaderboard rankings for that stage
7. THE Stage_Activation_Scheduler SHALL check for stage status updates at least once per minute

### Requirement 5: Stage-Specific Leaderboards

**User Story:** As a user, I want to see rankings for the current round, so that results are clear and understandable.

#### Acceptance Criteria

1. WHEN a user views a leaderboard, THE System SHALL display only votes associated with the specified stage
2. WHEN calculating rankings, THE System SHALL never include votes from other stages
3. WHEN a stage is active, THE System SHALL update the leaderboard in real-time as votes are recorded
4. WHEN a stage is completed, THE System SHALL display the final frozen rankings
5. WHEN a user views historical stages, THE System SHALL display the preserved rankings from when the stage closed
6. THE System SHALL generate leaderboard rankings within 2 seconds of a vote being recorded

### Requirement 6: Automatic Qualification Processing

**User Story:** As the system, I want to automatically move top contestants to the next stage, so that competition progresses without manual intervention.

#### Acceptance Criteria

1. WHEN a stage closes, THE Qualification_Processor SHALL execute immediately after status update
2. WHERE qualification rule is "Top N", THE Qualification_Processor SHALL select the N contestants with the highest vote counts
3. WHERE qualification rule is "Threshold", THE Qualification_Processor SHALL select all contestants with vote counts greater than or equal to the threshold
4. WHERE qualification rule is "Manual", THE Qualification_Processor SHALL not automatically add contestants to the next stage
5. WHEN contestants qualify, THE Qualification_Processor SHALL insert them into the next stage in sequence order
6. WHEN a contestant does not qualify, THE Qualification_Processor SHALL not add them to the next stage
7. WHEN qualification processing completes, THE Qualification_Processor SHALL log all qualified contestants
8. THE Qualification_Processor SHALL be idempotent and safe to run multiple times without duplicating contestants

### Requirement 7: Permanent Result Storage

**User Story:** As an organizer, I want permanent results stored for each stage, so that disputes can be resolved and historical data is preserved.

#### Acceptance Criteria

1. WHEN a stage closes, THE System SHALL create a Stage_Result snapshot containing final rankings and vote counts
2. WHEN a Stage_Result is created, THE System SHALL store contestant IDs, vote counts, and final rank positions
3. WHEN a Stage_Result is created, THE System SHALL mark it as immutable
4. WHEN an organizer attempts to modify a Stage_Result, THE System SHALL reject the modification
5. WHEN an organizer views results, THE System SHALL allow querying all votes for audit purposes
6. WHEN an organizer requests an export, THE System SHALL generate a downloadable report of stage results
7. THE System SHALL ensure Stage_Result data can reproduce the exact leaderboard from the time of closure

### Requirement 8: Vote Payment Integration

**User Story:** As the system, I want to ensure votes are only created after payment confirmation, so that revenue integrity is maintained.

#### Acceptance Criteria

1. WHEN processing a vote payment, THE System SHALL validate payment confirmation before creating the vote record
2. WHEN a payment is confirmed, THE System SHALL validate that the stage is still active
3. IF payment is confirmed after stage closure, THEN THE System SHALL reject the vote and initiate a refund process
4. WHEN processing a transaction, THE System SHALL validate that the transaction reference is unique
5. IF a transaction reference already exists, THEN THE System SHALL reject the duplicate transaction
6. WHEN a vote is created, THE System SHALL link it to the payment transaction reference

### Requirement 9: Stage Overlap Prevention

**User Story:** As the system, I want to prevent stage overlaps within a contest, so that voting rules remain clear and unambiguous.

#### Acceptance Criteria

1. WHEN an organizer creates or updates a stage, THE System SHALL validate that the stage period does not overlap with other stages in the same contest
2. WHEN checking for overlaps, THE System SHALL compare start date/time and end date/time ranges
3. IF an overlap is detected, THEN THE System SHALL reject the operation and return a descriptive error message
4. THE System SHALL allow stages in different contests to have overlapping periods
5. WHEN an organizer edits a stage's end time while the stage is active, THE System SHALL recalculate the closure time safely

### Requirement 10: Tie-Breaking Rules

**User Story:** As the system, I want to handle ties in qualification fairly, so that results are deterministic and transparent.

#### Acceptance Criteria

1. WHERE qualification rule is "Top N" and multiple contestants have the same vote count at the qualification boundary, THE System SHALL apply a tie-breaking rule
2. WHEN breaking ties, THE System SHALL use the timestamp of the last vote received as the primary tie-breaker
3. WHEN breaking ties by timestamp, THE System SHALL rank the contestant with the earlier last vote higher
4. IF timestamps are identical, THEN THE System SHALL assign shared positions to tied contestants
5. WHEN shared positions occur, THE System SHALL qualify all tied contestants if they are at the qualification boundary
6. THE System SHALL log all tie-breaking decisions for audit purposes

### Requirement 11: Edge Case Handling

**User Story:** As the system, I want to handle edge cases gracefully, so that the system remains reliable and predictable.

#### Acceptance Criteria

1. WHEN no contestants meet the qualification criteria, THE System SHALL mark the stage as complete without activating the next stage
2. WHEN the qualification processor fails, THE System SHALL log the error and allow manual retry
3. WHEN the scheduler recovers from downtime, THE System SHALL process all missed stage transitions in chronological order
4. WHEN a stage has no contestants, THE System SHALL prevent the stage from becoming active
5. IF a stage becomes active with no contestants, THEN THE System SHALL automatically close it and log a warning

## Summary

This requirements document defines a comprehensive multi-stage voting system that enables progressive contestant qualification through automated stage management, isolated voting per round, and permanent result storage. The system ensures fairness through automatic activation/closure, prevents vote carryover between stages, and maintains data integrity through immutable result snapshots.
