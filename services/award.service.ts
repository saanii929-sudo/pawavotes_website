import Award, { IAward } from '@/models/Award';
import { CreateAwardInput, UpdateAwardInput } from '@/lib/schemas';
import { AppError } from '@/utils/error-handler';
import connectDB from '@/lib/mongodb';

export class AwardService {
  async createAward(organizationId: string, data: CreateAwardInput): Promise<IAward> {
    await connectDB();
    
    const award = new Award({
      ...data,
      organizationId,
      createdBy: organizationId,
    });
    
    return await award.save();
  }

  async getAwardById(awardId: string): Promise<IAward> {
    await connectDB();
    
    const award = await Award.findById(awardId);
    if (!award) {
      throw new AppError(404, 'Award not found');
    }
    
    return award;
  }

  async getAwardsByOrganization(organizationId: string, page = 1, limit = 10) {
    await connectDB();
    
    const skip = (page - 1) * limit;
    
    const awards = await Award.find({ organizationId })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    const total = await Award.countDocuments({ organizationId });
    
    return {
      awards,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateAward(awardId: string, data: UpdateAwardInput): Promise<IAward> {
    await connectDB();
    
    const award = await Award.findByIdAndUpdate(awardId, data, {
      new: true,
      runValidators: true,
    });
    
    if (!award) {
      throw new AppError(404, 'Award not found');
    }
    
    return award;
  }

  async deleteAward(awardId: string): Promise<void> {
    await connectDB();
    
    const result = await Award.findByIdAndDelete(awardId);
    
    if (!result) {
      throw new AppError(404, 'Award not found');
    }
  }

  async publishAward(awardId: string): Promise<IAward> {
    await connectDB();
    
    const award = await Award.findByIdAndUpdate(
      awardId,
      { published: true, status: 'live' },
      { new: true }
    );
    
    if (!award) {
      throw new AppError(404, 'Award not found');
    }
    
    return award;
  }

  async closeAward(awardId: string): Promise<IAward> {
    await connectDB();
    
    const award = await Award.findByIdAndUpdate(
      awardId,
      { status: 'closed' },
      { new: true }
    );
    
    if (!award) {
      throw new AppError(404, 'Award not found');
    }
    
    return award;
  }

  async getAllAwards(page = 1, limit = 10) {
    await connectDB();
    
    const skip = (page - 1) * limit;
    
    const awards = await Award.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    const total = await Award.countDocuments();
    
    return {
      awards,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}

export const awardService = new AwardService();
