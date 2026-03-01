import Vote from '@/models/Vote';
import StageResult from '@/models/StageResult';
import Nominee from '@/models/Nominee';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

export interface LeaderboardEntry {
  nomineeId: string;
  nomineeName: string;
  nomineeImage?: string;
  rank: number;
  voteCount: number;
  supporterCount: number;
  lastVoteAt?: Date;
}

export class LeaderboardService {
  async getStageLeaderboard(
    stageId: string,
    categoryId?: string
  ): Promise<LeaderboardEntry[]> {
    await connectDB();

    const matchStage: any = {
      stageId: new mongoose.Types.ObjectId(stageId),
      paymentStatus: 'completed',
    };

    if (categoryId) {
      matchStage.categoryId = new mongoose.Types.ObjectId(categoryId);
    }

    const results = await Vote.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$nomineeId',
          voteCount: { $sum: '$numberOfVotes' },
          supporterCount: { $sum: 1 }, // Count unique vote transactions (supporters)
          lastVoteAt: { $max: '$createdAt' },
        },
      },
      {
        $lookup: {
          from: 'nominees',
          localField: '_id',
          foreignField: '_id',
          as: 'nominee',
        },
      },
      { $unwind: '$nominee' },
      {
        $project: {
          nomineeId: '$_id',
          nomineeName: '$nominee.name',
          nomineeImage: '$nominee.image',
          voteCount: 1,
          supporterCount: 1,
          lastVoteAt: 1,
        },
      },
      { $sort: { voteCount: -1, lastVoteAt: 1 } },
    ]);
    return results.map((entry, index) => ({
      ...entry,
      nomineeId: entry.nomineeId.toString(),
      rank: index + 1,
    }));
  }
  async getHistoricalLeaderboard(
    stageId: string,
    categoryId?: string
  ): Promise<LeaderboardEntry[]> {
    await connectDB();

    const query: any = { stageId };
    if (categoryId) {
      query.categoryId = categoryId;
    }

    const result = await StageResult.findOne(query);

    if (!result) {
      return [];
    }

    return result.rankings.map((ranking) => ({
      nomineeId: ranking.nomineeId.toString(),
      nomineeName: ranking.nomineeName,
      rank: ranking.rank,
      voteCount: ranking.voteCount,
      lastVoteAt: ranking.lastVoteAt,
    }));
  }

  async createResultSnapshot(stageId: string): Promise<void> {
    await connectDB();
    const votes = await Vote.find({
      stageId,
      paymentStatus: 'completed',
    }).distinct('categoryId');

    for (const categoryId of votes) {
      const existing = await StageResult.findOne({ stageId, categoryId });
      if (existing) {
        continue;
      }
      const leaderboard = await this.getStageLeaderboard(
        stageId,
        categoryId.toString()
      );
      const sampleVote = await Vote.findOne({ stageId, categoryId });
      if (!sampleVote) continue;
      await StageResult.create({
        stageId,
        awardId: sampleVote.awardId,
        categoryId,
        rankings: leaderboard.map((entry) => ({
          nomineeId: entry.nomineeId,
          nomineeName: entry.nomineeName,
          rank: entry.rank,
          voteCount: entry.voteCount,
          qualified: false,
          lastVoteAt: entry.lastVoteAt,
        })),
        totalVotes: leaderboard.reduce((sum, entry) => sum + entry.voteCount, 0),
        snapshotAt: new Date(),
        immutable: true,
      });
    }
  }

  async invalidateCache(stageId: string, categoryId: string): Promise<void> {
    // TODO: Implement Redis cache invalidation when caching is added
    // For now, this is a no-op as we're querying directly from DB
  }
  async getAwardLeaderboard(
    awardId: string,
    stageId?: string,
    categoryId?: string
  ): Promise<LeaderboardEntry[]> {
    await connectDB();

    if (stageId) {
      return this.getStageLeaderboard(stageId, categoryId);
    }
    const matchStage: any = {
      awardId: new mongoose.Types.ObjectId(awardId),
      paymentStatus: 'completed',
    };

    if (categoryId) {
      matchStage.categoryId = new mongoose.Types.ObjectId(categoryId);
    }

    const results = await Vote.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$nomineeId',
          voteCount: { $sum: '$numberOfVotes' },
          supporterCount: { $sum: 1 }, // Count unique vote transactions (supporters)
          lastVoteAt: { $max: '$createdAt' },
        },
      },
      {
        $lookup: {
          from: 'nominees',
          localField: '_id',
          foreignField: '_id',
          as: 'nominee',
        },
      },
      { $unwind: '$nominee' },
      {
        $project: {
          nomineeId: '$_id',
          nomineeName: '$nominee.name',
          nomineeImage: '$nominee.image',
          voteCount: 1,
          supporterCount: 1,
          lastVoteAt: 1,
        },
      },
      { $sort: { voteCount: -1, lastVoteAt: 1 } },
    ]);

    return results.map((entry, index) => ({
      ...entry,
      nomineeId: entry.nomineeId.toString(),
      rank: index + 1,
    }));
  }
}

export const leaderboardService = new LeaderboardService();
