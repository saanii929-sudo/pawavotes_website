import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVote extends Document {
  awardId: string;
  categoryId: string;
  nomineeId: string;
  voterEmail: string;
  voterPhone: string;
  numberOfVotes: number;
  amount: number;
  paymentReference: string;
  paymentMethod: string;
  paymentStatus: 'pending' | 'completed' | 'failed';
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VoteSchema: Schema = new Schema(
  {
    awardId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Award',
      index: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Category',
      index: true,
    },
    nomineeId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Nominee',
      index: true,
    },
    voterEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    voterPhone: {
      type: String,
      required: true,
      trim: true,
    },
    numberOfVotes: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentReference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    paymentMethod: {
      type: String,
      default: 'mobile_money',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Vote: Model<IVote> =
  mongoose.models.Vote || mongoose.model<IVote>('Vote', VoteSchema);

export default Vote;
