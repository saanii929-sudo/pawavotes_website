import Stage, { IStage } from '@/models/Stage';
import { CreateStageInput, UpdateStageInput } from '@/lib/schemas';
import { AppError } from '@/utils/error-handler';
import connectDB from '@/lib/mongodb';

export class StageService {
  async createStage(data: CreateStageInput): Promise<IStage> {
    await connectDB();
    
    const stage = new Stage(data);
    return await stage.save();
  }

  async getStageById(stageId: string): Promise<IStage> {
    await connectDB();
    
    const stage = await Stage.findById(stageId);
    if (!stage) {
      throw new AppError(404, 'Stage not found');
    }
    
    return stage;
  }

  async getStagesByAward(awardId: string) {
    await connectDB();
    
    const stages = await Stage.find({ awardId })
      .sort({ order: 1 });
    
    return stages;
  }

  async updateStage(stageId: string, data: UpdateStageInput): Promise<IStage> {
    await connectDB();
    
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
    
    return await Stage.findOne({
      awardId,
      status: 'active',
    });
  }
}

export const stageService = new StageService();
