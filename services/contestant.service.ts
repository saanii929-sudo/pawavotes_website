import StageContestant, { IStageContestant } from '@/models/StageContestant';
import Nominee from '@/models/Nominee';
import connectDB from '@/lib/mongodb';

export class ContestantService {
  /**
   * Add contestants to a stage
   * @param stageId - The stage ID
   * @param nomineeIds - Array of nominee IDs to add
   * @param addedBy - How the contestants were added (manual, qualification, initial)
   * @param sourceStageId - Optional source stage ID (for qualification)
   */
  async addContestantsToStage(
    stageId: string,
    nomineeIds: string[],
    addedBy: 'manual' | 'qualification' | 'initial',
    sourceStageId?: string
  ): Promise<IStageContestant[]> {
    await connectDB();

    const addedContestants: IStageContestant[] = [];
    const errors: Array<{ nomineeId: string; error: string }> = [];

    for (const nomineeId of nomineeIds) {
      try {
        // Get nominee details to extract awardId and categoryId
        const nominee = await Nominee.findById(nomineeId);
        if (!nominee) {
          errors.push({ nomineeId, error: 'Nominee not found' });
          continue;
        }

        // Check if contestant already exists in this stage
        const existing = await StageContestant.findOne({ stageId, nomineeId });
        if (existing) {
          errors.push({ nomineeId, error: 'Contestant already exists in this stage' });
          continue;
        }

        // Create stage contestant
        const contestant = new StageContestant({
          stageId,
          awardId: nominee.awardId,
          categoryId: nominee.categoryId,
          nomineeId,
          addedBy,
          sourceStageId,
        });

        const savedContestant = await contestant.save();
        addedContestants.push(savedContestant);
      } catch (error: any) {
        errors.push({ nomineeId, error: error.message });
      }
    }

    if (errors.length > 0 && addedContestants.length === 0) {
      throw new Error(`Failed to add contestants: ${JSON.stringify(errors)}`);
    }

    return addedContestants;
  }

  /**
   * Remove a contestant from a stage
   * @param stageId - The stage ID
   * @param nomineeId - The nominee ID to remove
   */
  async removeContestantFromStage(stageId: string, nomineeId: string): Promise<void> {
    await connectDB();

    const result = await StageContestant.findOneAndDelete({ stageId, nomineeId });

    if (!result) {
      throw new Error('Contestant not found in this stage');
    }
  }

  /**
   * Get all contestants for a stage
   * @param stageId - The stage ID
   * @param categoryId - Optional category ID to filter by
   */
  async getStageContestants(stageId: string, categoryId?: string): Promise<any[]> {
    await connectDB();

    const query: any = { stageId };
    if (categoryId) {
      query.categoryId = categoryId;
    }

    const contestants = await StageContestant.find(query)
      .populate('nomineeId', 'name image')
      .populate('categoryId', 'name')
      .sort({ addedAt: 1 });

    // Transform the data to include names
    return contestants.map((contestant) => ({
      _id: contestant._id,
      nomineeId: contestant.nomineeId?._id || contestant.nomineeId,
      nomineeName: contestant.nomineeId?.name || 'Unknown',
      nomineeImage: contestant.nomineeId?.image,
      categoryId: contestant.categoryId?._id || contestant.categoryId,
      categoryName: contestant.categoryId?.name || 'Unknown',
      addedBy: contestant.addedBy,
      addedAt: contestant.addedAt,
      sourceStageId: contestant.sourceStageId,
    }));
  }

  /**
   * Check if a contestant is in a stage
   * @param stageId - The stage ID
   * @param nomineeId - The nominee ID
   */
  async isContestantInStage(stageId: string, nomineeId: string): Promise<boolean> {
    await connectDB();

    const contestant = await StageContestant.findOne({ stageId, nomineeId });
    return !!contestant;
  }

  /**
   * Get a contestant's stage history
   * @param nomineeId - The nominee ID
   */
  async getContestantStageHistory(nomineeId: string): Promise<IStageContestant[]> {
    await connectDB();

    const history = await StageContestant.find({ nomineeId })
      .populate('stageId')
      .sort({ addedAt: 1 });

    return history;
  }

  /**
   * Get all contestants for an award across all stages
   * @param awardId - The award ID
   */
  async getAwardContestants(awardId: string): Promise<IStageContestant[]> {
    await connectDB();

    const contestants = await StageContestant.find({ awardId })
      .populate('nomineeId')
      .populate('stageId')
      .sort({ addedAt: 1 });

    return contestants;
  }

  /**
   * Get contestants count for a stage
   * @param stageId - The stage ID
   */
  async getStageContestantsCount(stageId: string): Promise<number> {
    await connectDB();

    return await StageContestant.countDocuments({ stageId });
  }
}

export const contestantService = new ContestantService();
