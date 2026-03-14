import mongoose from 'mongoose';

/**
 * Ensure compound indexes exist for common query patterns.
 * Runs once on first DB connection (non-blocking).
 */
export async function ensureIndexes() {
  const db = mongoose.connection.db;
  if (!db) return;

  await Promise.all([
    // Nominee: the main query is { awardId } with optional categoryId/status filters
    db.collection('nominees').createIndex(
      { awardId: 1, categoryId: 1, nominationStatus: 1, createdAt: -1 },
      { background: true }
    ),
    // Category: queried by awardId (String type) with order sort
    db.collection('categories').createIndex(
      { awardId: 1, order: 1, createdAt: -1 },
      { background: true }
    ),
    // Vote: dashboard aggregation filter
    db.collection('votes').createIndex(
      { awardId: 1, paymentStatus: 1, createdAt: -1 },
      { background: true }
    ),
    // Payment: dashboard aggregation filter
    db.collection('payments').createIndex(
      { awardId: 1, status: 1, createdAt: -1 },
      { background: true }
    ),
    // Award: org lookup for access checks and listing
    db.collection('awards').createIndex(
      { organizationId: 1, createdAt: -1 },
      { background: true }
    ),
  ]).catch(() => {});
}
