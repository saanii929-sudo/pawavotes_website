import Voter, { IVoter } from '@/models/Voter';
import { CreateVoterInput, UpdateVoterInput } from '@/lib/schemas';
import { AppError } from '@/utils/error-handler';
import connectDB from '@/lib/mongodb';

export class VoterService {
  async createVoter(data: CreateVoterInput): Promise<IVoter> {
    await connectDB();
    
    // Check if voter already exists for this award
    const existingVoter = await Voter.findOne({
      email: data.email,
      awardId: data.awardId,
    });
    
    if (existingVoter) {
      return existingVoter;
    }
    
    const voter = new Voter(data);
    return await voter.save();
  }

  async getVoterById(voterId: string): Promise<IVoter> {
    await connectDB();
    
    const voter = await Voter.findById(voterId);
    if (!voter) {
      throw new AppError(404, 'Voter not found');
    }
    
    return voter;
  }

  async getVoterByEmailAndAward(email: string, awardId: string): Promise<IVoter | null> {
    await connectDB();
    
    return await Voter.findOne({ email, awardId });
  }

  async getVotersByAward(awardId: string, page = 1, limit = 50) {
    await connectDB();
    
    const skip = (page - 1) * limit;
    
    const voters = await Voter.find({ awardId })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    const total = await Voter.countDocuments({ awardId });
    
    return {
      voters,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateVoter(voterId: string, data: UpdateVoterInput): Promise<IVoter> {
    await connectDB();
    
    const voter = await Voter.findByIdAndUpdate(voterId, data, {
      new: true,
      runValidators: true,
    });
    
    if (!voter) {
      throw new AppError(404, 'Voter not found');
    }
    
    return voter;
  }

  async incrementVoteCount(voterId: string, amount: number): Promise<IVoter | null> {
    await connectDB();
    
    return await Voter.findByIdAndUpdate(
      voterId,
      {
        $inc: { voteCount: 1, totalSpent: amount },
        lastVotedAt: new Date(),
      },
      { new: true }
    );
  }

  async banVoter(voterId: string): Promise<IVoter> {
    await connectDB();
    
    const voter = await Voter.findByIdAndUpdate(
      voterId,
      { status: 'banned' },
      { new: true }
    );
    
    if (!voter) {
      throw new AppError(404, 'Voter not found');
    }
    
    return voter;
  }
}

export const voterService = new VoterService();
