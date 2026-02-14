import Nominee, { INominee } from '@/models/Nominee';
import { CreateNomineeInput, UpdateNomineeInput } from '@/lib/schemas';
import { AppError } from '@/utils/error-handler';
import connectDB from '@/lib/mongodb';

export class NomineeService {
  async createNominee(data: CreateNomineeInput): Promise<INominee> {
    await connectDB();
    
    const nominee = new Nominee(data);
    return await nominee.save();
  }

  async getNomineeById(nomineeId: string): Promise<INominee> {
    await connectDB();
    
    const nominee = await Nominee.findById(nomineeId);
    if (!nominee) {
      throw new AppError(404, 'Nominee not found');
    }
    
    return nominee;
  }

  async getNomineesByCategory(categoryId: string, page = 1, limit = 50) {
    await connectDB();
    
    const skip = (page - 1) * limit;
    
    const nominees = await Nominee.find({ categoryId })
      .skip(skip)
      .limit(limit)
      .sort({ voteCount: -1, createdAt: -1 });
    
    const total = await Nominee.countDocuments({ categoryId });
    
    return {
      nominees,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getNomineesByAward(awardId: string, page = 1, limit = 100) {
    await connectDB();
    
    const skip = (page - 1) * limit;
    
    const nominees = await Nominee.find({ awardId })
      .skip(skip)
      .limit(limit)
      .sort({ voteCount: -1, createdAt: -1 });
    
    const total = await Nominee.countDocuments({ awardId });
    
    return {
      nominees,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateNominee(nomineeId: string, data: UpdateNomineeInput): Promise<INominee> {
    await connectDB();
    
    const nominee = await Nominee.findByIdAndUpdate(nomineeId, data, {
      new: true,
      runValidators: true,
    });
    
    if (!nominee) {
      throw new AppError(404, 'Nominee not found');
    }
    
    return nominee;
  }

  async deleteNominee(nomineeId: string): Promise<void> {
    await connectDB();
    
    const result = await Nominee.findByIdAndDelete(nomineeId);
    
    if (!result) {
      throw new AppError(404, 'Nominee not found');
    }
  }

  async publishNominee(nomineeId: string): Promise<INominee> {
    await connectDB();
    
    const nominee = await Nominee.findByIdAndUpdate(
      nomineeId,
      { status: 'published' },
      { new: true }
    );
    
    if (!nominee) {
      throw new AppError(404, 'Nominee not found');
    }
    
    return nominee;
  }

  async incrementVoteCount(nomineeId: string, count: number): Promise<INominee | null> {
    await connectDB();
    
    return await Nominee.findByIdAndUpdate(
      nomineeId,
      { $inc: { voteCount: count } },
      { new: true }
    );
  }

  async getTopNominees(awardId: string, limit = 10) {
    await connectDB();
    
    return await Nominee.find({ awardId })
      .sort({ voteCount: -1 })
      .limit(limit);
  }
}

export const nomineeService = new NomineeService();
