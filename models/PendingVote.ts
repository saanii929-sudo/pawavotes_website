import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPendingVote extends Document {
  reference: string;
  awardId: string;
  categoryId: string;
  nomineeId: string;
  email: string;
  phone: string;
  numberOfVotes: number;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  paymentData?: any;
  createdAt: Date;
  updatedAt: Date;
}

const PendingVoteSchema: Schema = new Schema(
  {
    reference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    awardId: {
      type: String,
      required: true,
      index: true,
    },
    categoryId: {
      type: String,
      required: true,
      index: true,
    },
    nomineeId: {
      type: String,
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    numberOfVotes: {
      type: Number,
      required: true,
      min: 1,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    paymentData: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

const PendingVote: Model<IPendingVote> =
  mongoose.models.PendingVote || mongoose.model<IPendingVote>('PendingVote', PendingVoteSchema);

export default PendingVote;
