import mongoose from 'mongoose';

/**
 * Ensure compound indexes exist for common query patterns.
 * Call once on app startup or as a one-time migration.
 */
export async function ensureIndexes() {
  const db = mongoose.connection.db;
  if (!db) return;

  try {
    // Vote: common dashboard filter (awardId + paymentStatus + createdAt for velocity)
    await db.collection('votes').createIndex(
      { awardId: 1, paymentStatus: 1, createdAt: -1 },
      { background: true }
    );

    // Payment: dashboard aggregation filter
    await db.collection('payments').createIndex(
      { awardId: 1, status: 1, createdAt: -1 },
      { background: true }
    );

    // Nominee: dashboard count + vote sum by award
    await db.collection('nominees').createIndex(
      { awardId: 1, voteCount: 1 },
      { background: true }
    );

    // Category: count by award
    await db.collection('categories').createIndex(
      { awardId: 1 },
      { background: true }
    );

    // Award: org lookup
    await db.collection('awards').createIndex(
      { organizationId: 1, createdAt: -1 },
      { background: true }
    );
  } catch (err) {
    // Indexes may already exist — safe to ignore
  }
}
