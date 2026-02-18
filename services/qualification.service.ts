import Stage from '@/models/Stage';
import StageContestant from '@/models/StageContestant';
import StageResult from '@/models/StageResult';
import Vote from '@/models/Vote';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import { contestantService } from './contestant.service';

export interface QualifiedContestant {
  nomineeId: string;
  nomineeName: string;
  voteCount: number;
  rank: number;
  lastVoteAt?: Date;
}

export interface QualificationResult {
  stageId: string;
  qualifiedCount: number;
  qualifiedContestants: QualifiedContestant[];
  nextStageId?: string;
  processedAt: Date;
}

export class QualificationProcessor {
  async processStageQualification(stageId: string): Promise<QualificationResult> {
    await connectDB();
    const stage = await Stage.findById(stageId);
    if (!stage) {
      throw new Error('Stage not found');
    }
    if (stage.qualificationProcessed) {
      console.log(`Stage ${stageId} already processed qualification`);
      return {
        stageId,
        qualifiedCount: 0,
        qualifiedContestants: [],
        processedAt: stage.qualificationProcessedAt || new Date(),
      };
    }
    if (stage.status !== 'completed') {
      throw new Error('Cannot process qualification for non-completed stage');
    }

    let qualifiedContestants: QualifiedContestant[] = [];
    switch (stage.qualificationRule) {
      case 'topN':
        if (!stage.qualificationCount) {
          throw new Error('Qualification count is required for topN rule');
        }
        qualifiedContestants = await this.processTopN(stage, stage.qualificationCount);
        break;

      case 'threshold':
        if (!stage.qualificationThreshold) {
          throw new Error('Qualification threshold is required for threshold rule');
        }
        qualifiedContestants = await this.processThreshold(
          stage,
          stage.qualificationThreshold
        );
        break;

      case 'manual':
        console.log(`Stage ${stageId} uses manual qualification - skipping automatic processing`);
        await this.markQualificationProcessed(stageId);
        return {
          stageId,
          qualifiedCount: 0,
          qualifiedContestants: [],
          processedAt: new Date(),
        };

      default:
        throw new Error(`Unknown qualification rule: ${stage.qualificationRule}`);
    }
    await this.updateResultsWithQualification(stageId, qualifiedContestants);
    const nextStage = await Stage.findOne({
      awardId: stage.awardId,
      order: stage.order + 1,
    });
    if (nextStage) {
      await this.addContestantsToNextStage(qualifiedContestants, nextStage._id.toString());
    }
    await this.markQualificationProcessed(stageId);

    console.log(
      `Qualification processed for stage ${stageId}: ${qualifiedContestants.length} contestants qualified`
    );

    return {
      stageId,
      qualifiedCount: qualifiedContestants.length,
      qualifiedContestants,
      nextStageId: nextStage?._id.toString(),
      processedAt: new Date(),
    };
  }
  async processTopN(stage: any, count: number): Promise<QualifiedContestant[]> {
    await connectDB();
    const contestants = await this.getContestantsWithVotes(stage._id.toString());

    if (contestants.length === 0) {
      return [];
    }
    contestants.sort((a, b) => {
      if (b.voteCount !== a.voteCount) {
        return b.voteCount - a.voteCount;
      }
      if (a.lastVoteAt && b.lastVoteAt) {
        return a.lastVoteAt.getTime() - b.lastVoteAt.getTime();
      }
      return 0;
    });
    const qualified = await this.resolveTies(contestants, count);

    return qualified;
  }
  async processThreshold(stage: any, threshold: number): Promise<QualifiedContestant[]> {
    await connectDB();
    const contestants = await this.getContestantsWithVotes(stage._id.toString());
    const qualified = contestants.filter((c) => c.voteCount >= threshold);
    qualified.sort((a, b) => {
      if (b.voteCount !== a.voteCount) {
        return b.voteCount - a.voteCount;
      }
      if (a.lastVoteAt && b.lastVoteAt) {
        return a.lastVoteAt.getTime() - b.lastVoteAt.getTime();
      }
      return 0;
    });

    return qualified;
  }
  async resolveTies(
    contestants: QualifiedContestant[],
    cutoffRank: number
  ): Promise<QualifiedContestant[]> {
    if (contestants.length <= cutoffRank) {
      return contestants;
    }

    const cutoffVoteCount = contestants[cutoffRank - 1].voteCount;
    const tiedContestants = contestants.filter((c) => c.voteCount === cutoffVoteCount);

    if (tiedContestants.length === 1) {
      return contestants.slice(0, cutoffRank);
    }
    tiedContestants.sort((a, b) => {
      if (a.lastVoteAt && b.lastVoteAt) {
        return a.lastVoteAt.getTime() - b.lastVoteAt.getTime();
      }
      return 0;
    });
    const aboveCutoff = contestants.filter((c) => c.voteCount > cutoffVoteCount);
    const remainingSlots = cutoffRank - aboveCutoff.length;
    return [...aboveCutoff, ...tiedContestants.slice(0, remainingSlots)];
  }


  async addContestantsToNextStage(
    contestants: QualifiedContestant[],
    nextStageId: string
  ): Promise<void> {
    await connectDB();

    const nomineeIds = contestants.map((c) => c.nomineeId);

    await contestantService.addContestantsToStage(
      nextStageId,
      nomineeIds,
      'qualification'
    );

    console.log(`Added ${nomineeIds.length} contestants to next stage ${nextStageId}`);
  }
  async markQualificationProcessed(stageId: string): Promise<void> {
    await connectDB();

    await Stage.findByIdAndUpdate(stageId, {
      qualificationProcessed: true,
      qualificationProcessedAt: new Date(),
    });
  }

  private async getContestantsWithVotes(
    stageId: string
  ): Promise<QualifiedContestant[]> {
    await connectDB();

    const results = await Vote.aggregate([
      {
        $match: {
          stageId: new mongoose.Types.ObjectId(stageId),
          paymentStatus: 'completed',
        },
      },
      {
        $group: {
          _id: '$nomineeId',
          voteCount: { $sum: '$numberOfVotes' },
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
          voteCount: 1,
          lastVoteAt: 1,
        },
      },
      { $sort: { voteCount: -1, lastVoteAt: 1 } },
    ]);

    return results.map((entry, index) => ({
      nomineeId: entry.nomineeId.toString(),
      nomineeName: entry.nomineeName,
      voteCount: entry.voteCount,
      rank: index + 1,
      lastVoteAt: entry.lastVoteAt,
    }));
  }

  private async updateResultsWithQualification(
    stageId: string,
    qualifiedContestants: QualifiedContestant[]
  ): Promise<void> {
    await connectDB();

    const qualifiedIds = new Set(qualifiedContestants.map((c) => c.nomineeId));
    const results = await StageResult.find({ stageId });

    for (const result of results) {
      result.rankings.forEach((ranking) => {
        ranking.qualified = qualifiedIds.has(ranking.nomineeId.toString());
      });
      await StageResult.updateOne(
        { _id: result._id },
        {
          $set: {
            rankings: result.rankings,
          },
        }
      );
    }
  }
}

export const qualificationProcessor = new QualificationProcessor();
