import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPayment extends Document {
  transactionId: string;
  nomineeId: string;
  awardId: string;
  paymentMethod: 'mobile_money' | 'bank_transfer' | 'card' | 'manual';
  amount: number;
  currency: string;
  voteCount: number;
  status: 'successful' | 'pending' | 'failed' | 'refunded';
  reference?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema: Schema = new Schema(
  {
    transactionId: {
      type: String,
      required: [true, 'Transaction ID is required'],
      unique: true,
    },
    nomineeId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Nominee ID is required'],
      ref: 'Nominee',
    },
    awardId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Award ID is required'],
      ref: 'Award',
    },
    paymentMethod: {
      type: String,
      enum: ['mobile_money', 'bank_transfer', 'card', 'manual'],
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
    },
    currency: {
      type: String,
      default: 'GHS',
    },
    voteCount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['successful', 'pending', 'failed', 'refunded'],
      default: 'pending',
    },
    reference: String,
    metadata: Schema.Types.Mixed,
  },
  {
    timestamps: true,
    indexes: [
      { transactionId: 1 },
      { nomineeId: 1 },
      { awardId: 1 },
      { status: 1 },
      { createdAt: 1 },
    ],
  }
);

const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);

export default Payment;
