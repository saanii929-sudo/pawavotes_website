import Vote, { IVote } from '@/models/Vote';
import { CreateVoteInput } from '@/lib/schemas';
import { AppError } from '@/utils/error-handler';
import connectDB from '@/lib/mongodb';

export class VoteService {
  async createVote(data: CreateVoteInput): Promise<IVote> {
    await connectDB();
    
    const vote = new Vote({
      ...data,
      status: 'successful',
      amount: data.voteCount * 0.5, // Default price
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
