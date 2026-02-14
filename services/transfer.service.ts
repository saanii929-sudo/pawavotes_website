import Transfer, { ITransfer } from '@/models/Transfer';
import { CreateTransferInput } from '@/lib/schemas';
import { AppError } from '@/utils/error-handler';
import connectDB from '@/lib/mongodb';
import { generateReferenceId } from '@/utils/helpers';

export class TransferService {
  async createTransfer(data: CreateTransferInput, userId: string): Promise<ITransfer> {
    await connectDB();
    
    const transfer = new Transfer({
      ...data,
      referenceId: generateReferenceId('FT'),
      initiatedBy: userId,
      status: 'pending',
    });
    
    return await transfer.save();
  }

  async getTransferById(transferId: string): Promise<ITransfer> {
    await connectDB();
    
    const transfer = await Transfer.findById(transferId);
    if (!transfer) {
      throw new AppError(404, 'Transfer not found');
    }
    
    return transfer;
  }

  async getTransferByReferenceId(referenceId: string): Promise<ITransfer> {
    await connectDB();
    
    const transfer = await Transfer.findOne({ referenceId });
    if (!transfer) {
      throw new AppError(404, 'Transfer not found');
    }
    
    return transfer;
  }

  async getTransfersByAward(awardId: string, page = 1, limit = 50) {
    await connectDB();
    
    const skip = (page - 1) * limit;
    
    const transfers = await Transfer.find({ awardId })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    const total = await Transfer.countDocuments({ awardId });
    
    return {
      transfers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateTransferStatus(transferId: string, status: 'successful' | 'pending' | 'failed'): Promise<ITransfer> {
    await connectDB();
    
    const transfer = await Transfer.findByIdAndUpdate(
      transferId,
      { status },
      { new: true }
    );
    
    if (!transfer) {
      throw new AppError(404, 'Transfer not found');
    }
    
    return transfer;
  }

  async getTotalTransfersByAward(awardId: string, status = 'successful'): Promise<number> {
    await connectDB();
    
    const result = await Transfer.aggregate([
      { $match: { awardId: awardId as any, status } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    
    return result[0]?.total || 0;
  }
}

export const transferService = new TransferService();
