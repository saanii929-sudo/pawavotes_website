import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVoter extends Document {
  email: string;
  phone?: string;
  name?: string;
  awardId: string;
  voteCount: number;
  totalSpent: number;
  lastVotedAt?: Date;
  status: 'active' | 'banned' | 'inactive';
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const VoterSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    awardId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Award ID is required'],
      ref: 'Award',
    },
    voteCount: {
      type: Number,
      default: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
    },
    lastVotedAt: Date,
    status: {
      type: String,
      enum: ['active', 'banned', 'inactive'],
      default: 'active',
    },
    metadata: Schema.Types.Mixed,
  },
  {
    timestamps: true,
    indexes: [
      { awardId: 1, email: 1 },
      { awardId: 1, status: 1 },
      { createdAt: 1 },
    ],
  }
);

const Voter: Model<IVoter> =
  mongoose.models.Voter || mongoose.model<IVoter>('Voter', VoterSchema);

export default Voter;
