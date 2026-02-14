import Payment, { IPayment } from '@/models/Payment';
import { CreatePaymentInput } from '@/lib/schemas';
import { AppError } from '@/utils/error-handler';
import connectDB from '@/lib/mongodb';
import { generateTransactionId } from '@/utils/helpers';

export class PaymentService {
  async createPayment(data: CreatePaymentInput): Promise<IPayment> {
    await connectDB();
    
    const payment = new Payment({
      ...data,
      transactionId: generateTransactionId(),
      status: 'successful',
      currency: 'GHS',
    });
    
    return await payment.save();
  }

  async getPaymentById(paymentId: string): Promise<IPayment> {
    await connectDB();
    
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new AppError(404, 'Payment not found');
    }
    
    return payment;
  }

  async getPaymentByTransactionId(transactionId: string): Promise<IPayment> {
    await connectDB();
    
    const payment = await Payment.findOne({ transactionId });
    if (!payment) {
      throw new AppError(404, 'Payment not found');
    }
    
    return payment;
  }

  async getPaymentsByAward(awardId: string, page = 1, limit = 50) {
    await connectDB();
    
    const skip = (page - 1) * limit;
    
    const payments = await Payment.find({ awardId })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    const total = await Payment.countDocuments({ awardId });
    
    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getPaymentsByNominee(nomineeId: string, page = 1, limit = 50) {
    await connectDB();
    
    const skip = (page - 1) * limit;
    
    const payments = await Payment.find({ nomineeId })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    const total = await Payment.countDocuments({ nomineeId });
    
    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getTotalRevenueByAward(awardId: string): Promise<number> {
    await connectDB();
    
    const result = await Payment.aggregate([
      { $match: { awardId: awardId as any, status: 'successful' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    
    return result[0]?.total || 0;
  }

  async updatePaymentStatus(paymentId: string, status: 'successful' | 'pending' | 'failed' | 'refunded'): Promise<IPayment> {
    await connectDB();
    
    const payment = await Payment.findByIdAndUpdate(
      paymentId,
      { status },
      { new: true }
    );
    
    if (!payment) {
      throw new AppError(404, 'Payment not found');
    }
    
    return payment;
  }
}

export const paymentService = new PaymentService();
