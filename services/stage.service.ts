import Stage, { IStage } from '@/models/Stage';
import { CreateStageInput, UpdateStageInput } from '@/lib/schemas';
import { AppError } from '@/utils/error-handler';
import connectDB from '@/lib/mongodb';

export class StageService {
  /**
   * Validate that a stage doesn't overlap with other stages in the same award
   */
  async validateNoOverlap(
    awardId: string,
    startDate: Date,
    startTime: string,
    endDate: Date,
    endTime: string,
    excludeStageId?: string
  ): Promise<void> {
    await connectDB();

    // Combine date and time for accurate comparison
    const newStart = this.combineDateAndTime(startDate, startTime);
    const newEnd = this.combineDateAndTime(endDate, endTime);

    // Find all stages for this award
    const query: any = { awardId };
    if (excludeStageId) {
      query._id = { $ne: excludeStageId };
    }

    const existingStages = await Stage.find(query);

    // Check for overlaps
    for (const stage of existingStages) {
      const existingStart = this.combineDateAndTime(stage.startDate, stage.startTime);
      const existingEnd = this.combineDateAndTime(stage.endDate, stage.endTime);

      // Check if periods overlap
      if (
        (newStart >= existingStart && newStart < existingEnd) ||
        (newEnd > existingStart && newEnd <= existingEnd) ||
        (newStart <= existingStart && newEnd >= existingEnd)
      ) {
        throw new AppError(
          400,
          `Stage period overlaps with existing stage "${stage.name}" (${stage.startDate.toISOString().split('T')[0]} ${stage.startTime} - ${stage.endDate.toISOString().split('T')[0]} ${stage.endTime})`
        );
      }
    }
  }

  /**
   * Helper to combine date and time into a single Date object
   */
  private combineDateAndTime(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const combined = new Date(date);
    combined.setHours(hours, minutes, 0, 0);
    return combined;
  }

  /**
   * Calculate the current status of a stage based on datetime
   */
  private calculateStageStatus(stage: IStage): 'upcoming' | 'active' | 'completed' {
    const now = new Date();
    const stageStart = this.combineDateAndTime(stage.startDate, stage.startTime);
    const stageEnd = this.combineDateAndTime(stage.endDate, stage.endTime);

    if (now < stageStart) {
      return 'upcoming';
    } else if (now >= stageStart && now <= stageEnd) {
      return 'active';
    } else {
      return 'completed';
    }
  }

  /**
   * Update stage with calculated status
   */
  private enrichStageWithStatus(stage: any): any {
    const calculatedStatus = this.calculateStageStatus(stage);
    return {
      ...stage.toObject ? stage.toObject() : stage,
      status: calculatedStatus,
    };
  }

  async createStage(data: CreateStageInput): Promise<IStage> {
    await connectDB();

    // Get the award to check voting period
    const Award = (await import('@/models/Award')).default;
    const award = await Award.findById(data.awardId);
    if (!award) {
      throw new AppError(404, 'Award not found');
    }

    // Validate stage falls within award's voting period
    const stageStart = this.combineDateAndTime(new Date(data.startDate), data.startTime);
    const stageEnd = this.combineDateAndTime(new Date(data.endDate), data.endTime);
    
    const awardVotingStart = this.combineDateAndTime(
      new Date(award.votingStartDate),
      award.votingStartTime
    );
    const awardVotingEnd = this.combineDateAndTime(
      new Date(award.votingEndDate),
      award.votingEndTime
    );

    if (stageStart < awardVotingStart) {
      throw new AppError(
        400,
        `Stage start time (${data.startDate} ${data.startTime}) cannot be before award voting start time (${award.votingStartDate.toISOString().split('T')[0]} ${award.votingStartTime})`
      );
    }

    if (stageEnd > awardVotingEnd) {
      throw new AppError(
        400,
        `Stage end time (${data.endDate} ${data.endTime}) cannot be after award voting end time (${award.votingEndDate.toISOString().split('T')[0]} ${award.votingEndTime})`
      );
    }

    // Validate no overlap with other stages
    await this.validateNoOverlap(
      data.awardId,
      new Date(data.startDate),
      data.startTime,
      new Date(data.endDate),
      data.endTime
    );
    
    const stage = new Stage(data);
    return await stage.save();
  }

  async getStageById(stageId: string): Promise<IStage> {
    await connectDB();
    
    const stage = await Stage.findById(stageId);
    if (!stage) {
      throw new AppError(404, 'Stage not found');
    }
    
    return this.enrichStageWithStatus(stage);
  }

  async getStagesByAward(awardId: string) {
    await connectDB();
    
    const stages = await Stage.find({ awardId })
      .sort({ order: 1 });
    
    // Enrich each stage with calculated status
    return stages.map(stage => this.enrichStageWithStatus(stage));
  }

  async updateStage(stageId: string, data: UpdateStageInput): Promise<IStage> {
    await connectDB();

    const existingStage = await Stage.findById(stageId);
    if (!existingStage) {
      throw new AppError(404, 'Stage not found');
    }

    // If dates/times are being updated, validate against award's voting period and overlaps
    if (data.startDate || data.endDate || data.startTime || data.endTime) {
      // Get the award to check voting period
      const Award = (await import('@/models/Award')).default;
      const award = await Award.findById(existingStage.awardId);
      if (!award) {
        throw new AppError(404, 'Award not found');
      }

      const newStartDate = data.startDate ? new Date(data.startDate) : existingStage.startDate;
      const newEndDate = data.endDate ? new Date(data.endDate) : existingStage.endDate;
      const newStartTime = data.startTime || existingStage.startTime;
      const newEndTime = data.endTime || existingStage.endTime;

      // Validate stage falls within award's voting period
      const stageStart = this.combineDateAndTime(newStartDate, newStartTime);
      const stageEnd = this.combineDateAndTime(newEndDate, newEndTime);
      
      const awardVotingStart = this.combineDateAndTime(
        new Date(award.votingStartDate),
        award.votingStartTime
      );
      const awardVotingEnd = this.combineDateAndTime(
        new Date(award.votingEndDate),
        award.votingEndTime
      );

      if (stageStart < awardVotingStart) {
        throw new AppError(
          400,
          `Stage start time cannot be before award voting start time (${award.votingStartDate.toISOString().split('T')[0]} ${award.votingStartTime})`
        );
      }

      if (stageEnd > awardVotingEnd) {
        throw new AppError(
          400,
          `Stage end time cannot be after award voting end time (${award.votingEndDate.toISOString().split('T')[0]} ${award.votingEndTime})`
        );
      }

      // Validate no overlap with other stages
      await this.validateNoOverlap(
        existingStage.awardId.toString(),
        newStartDate,
        newStartTime,
        newEndDate,
        newEndTime,
        stageId
      );
    }
    
    const stage = await Stage.findByIdAndUpdate(stageId, data, {
      new: true,
      runValidators: true,
    });
    
    if (!stage) {
      throw new AppError(404, 'Stage not found');
    }
    
    return stage;
  }

  async deleteStage(stageId: string): Promise<void> {
    await connectDB();
    
    const result = await Stage.findByIdAndDelete(stageId);
    
    if (!result) {
      throw new AppError(404, 'Stage not found');
    }
  }

  async updateStageStatus(stageId: string, status: 'upcoming' | 'active' | 'completed'): Promise<IStage> {
    await connectDB();
    
    const stage = await Stage.findByIdAndUpdate(
      stageId,
      { status },
      { new: true }
    );
    
    if (!stage) {
      throw new AppError(404, 'Stage not found');
    }
    
    return stage;
  }

  async getCurrentStage(awardId: string): Promise<IStage | null> {
    await connectDB();
    
    const stages = await Stage.find({ awardId }).sort({ order: 1 });
    
    // Find the stage that is currently active based on datetime
    for (const stage of stages) {
      const calculatedStatus = this.calculateStageStatus(stage);
      if (calculatedStatus === 'active') {
        return this.enrichStageWithStatus(stage);
      }
    }
    
    return null;
  }

  /**
   * Get the active stage for an award
   */
  async getActiveStage(awardId: string): Promise<IStage | null> {
    await connectDB();
    
    const stages = await Stage.find({ awardId }).sort({ order: 1 });
    
    // Find the stage that is currently active based on datetime
    for (const stage of stages) {
      const calculatedStatus = this.calculateStageStatus(stage);
      if (calculatedStatus === 'active') {
        return this.enrichStageWithStatus(stage);
      }
    }
    
    return null;
  }

  /**
   * Get the next stage in sequence after the current stage
   */
  async getNextStage(currentStageId: string): Promise<IStage | null> {
    await connectDB();
    
    const currentStage = await Stage.findById(currentStageId);
    if (!currentStage) {
      return null;
    }

    return await Stage.findOne({
      awardId: currentStage.awardId,
      order: { $gt: currentStage.order },
    }).sort({ order: 1 });
  }

  /**
   * Get all stages for an award with a specific status
   */
  async getStagesByStatus(awardId: string, status: 'upcoming' | 'active' | 'completed'): Promise<IStage[]> {
    await connectDB();
    
    const stages = await Stage.find({ awardId }).sort({ order: 1 });
    
    // Filter stages by calculated status
    return stages
      .map(stage => this.enrichStageWithStatus(stage))
      .filter(stage => stage.status === status);
  }
}

export const stageService = new StageService();
