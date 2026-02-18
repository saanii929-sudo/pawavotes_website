import Vote, { IVote } from '@/models/Vote';
import Stage from '@/models/Stage';
import StageContestant from '@/models/StageContestant';
import { CreateVoteInput } from '@/lib/schemas';
import { AppError } from '@/utils/error-handler';
import connectDB from '@/lib/mongodb';

export class VoteService {
  /**
   * Validate that a stage is active and eligible for voting
   */
  async validateStageForVoting(awardId: string, stageId: string): Promise<void> {
    await connectDB();

    const stage = await Stage.findOne({ _id: stageId, awardId });

    if (!stage) {
      throw new AppError(404, 'Stage not found for this award');
    }

    if (stage.status !== 'active') {
      throw new AppError(
        400,
        `Voting is not allowed for ${stage.status} stages. Stage "${stage.name}" is currently ${stage.status}.`
      );
    }

    // Additional check: verify current time is within stage period
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);

    const stageStartDate = stage.startDate.toISOString().split('T')[0];
    const stageEndDate = stage.endDate.toISOString().split('T')[0];

    const isBeforeStart =
      currentDate < stageStartDate ||
      (currentDate === stageStartDate && currentTime < stage.startTime);

    const isAfterEnd =
      currentDate > stageEndDate ||
      (currentDate === stageEndDate && currentTime > stage.endTime);

    if (isBeforeStart) {
      throw new AppError(
        400,
        `Voting has not started yet. Stage "${stage.name}" starts on ${stageStartDate} at ${stage.startTime}.`
      );
    }

    if (isAfterEnd) {
      throw new AppError(
        400,
        `Voting has ended. Stage "${stage.name}" ended on ${stageEndDate} at ${stage.endTime}.`
      );
    }
  }

  /**
   * Validate that a contestant is eligible to receive votes in a stage
   */
  async validateContestantInStage(
    stageId: string,
    nomineeId: string
  ): Promise<void> {
    await connectDB();

    const contestant = await StageContestant.findOne({ stageId, nomineeId });

    if (!contestant) {
      throw new AppError(
        400,
        'This nominee is not eligible to receive votes in the current stage.'
      );
    }
  }

  /**
   * Get the active stage for an award
   */
  async getActiveStage(awardId: string): Promise<any | null> {
    await connectDB();

    const activeStage = await Stage.findOne({
      awardId,
      status: 'active',
    });

    return activeStage;
  }

  /**
   * Create a vote with stage validation
   */
  async createVote(data: CreateVoteInput): Promise<IVote> {
    await connectDB();

    // If stageId is provided, validate it
    if (data.stageId) {
      await this.validateStageForVoting(data.awardId, data.stageId);
      await this.validateContestantInStage(data.stageId, data.nomineeId);
    } else {
      // If no stageId provided, try to get active stage
      const activeStage = await this.getActiveStage(data.awardId);

      if (activeStage) {
        // Award has stages - must vote through active stage
        await this.validateContestantInStage(
          activeStage._id.toString(),
          data.nomineeId
        );
        data.stageId = activeStage._id.toString();
      }
      // If no active stage, allow vote without stage (backward compatibility)
    }

    const vote = new Vote({
      ...data,
      numberOfVotes: data.voteCount || data.numberOfVotes || 1,
      status: 'successful',
      amount: (data.voteCount || data.numberOfVotes || 1) * 0.5, // Default price
    });

    return await vote.save();
  }

  async getVoteById(voteId: string): Promise<IVote> {
    await connectDB();
    
    const vote = await Vote.findById(voteId);
    if (!vote) {
      throw new AppError(404, 'Vote not found');
    }
    
    return vote;
  }

  async getVotesByNominee(nomineeId: string, page = 1, limit = 50) {
    await connectDB();
    
    const skip = (page - 1) * limit;
    
    const votes = await Vote.find({ nomineeId })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    const total = await Vote.countDocuments({ nomineeId });
    
    return {
      votes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getVotesByCategory(categoryId: string, page = 1, limit = 50) {
    await connectDB();
    
    const skip = (page - 1) * limit;
    
    const votes = await Vote.find({ categoryId })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    const total = await Vote.countDocuments({ categoryId });
    
    return {
      votes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getVotesByAward(awardId: string, page = 1, limit = 100) {
    await connectDB();
    
    const skip = (page - 1) * limit;
    
    const votes = await Vote.find({ awardId })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    const total = await Vote.countDocuments({ awardId });
    
    return {
      votes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateVoteStatus(voteId: string, status: 'successful' | 'pending' | 'failed'): Promise<IVote> {
    await connectDB();
    
    const vote = await Vote.findByIdAndUpdate(
      voteId,
      { status },
      { new: true }
    );
    
    if (!vote) {
      throw new AppError(404, 'Vote not found');
    }
    
    return vote;
  }

  async getTotalVotesByNominee(nomineeId: string): Promise<number> {
    await connectDB();
    
    const result = await Vote.aggregate([
      { $match: { nomineeId: nomineeId as any } },
      { $group: { _id: null, total: { $sum: '$voteCount' } } },
    ]);
    
    return result[0]?.total || 0;
  }

  async getTotalVotesByCategory(categoryId: string): Promise<number> {
    await connectDB();
    
    const result = await Vote.aggregate([
      { $match: { categoryId: categoryId as any } },
      { $group: { _id: null, total: { $sum: '$voteCount' } } },
    ]);
    
    return result[0]?.total || 0;
  }
}

export const voteService = new VoteService();
