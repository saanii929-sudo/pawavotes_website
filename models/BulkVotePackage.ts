import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBulkVotePackage extends Document {
  awardId: string;
  amount: number;
  votes: number;
  currency: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BulkVotePackageSchema: Schema = new Schema(
  {
    awardId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Award ID is required'],
      ref: 'Award',
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
    },
    votes: {
      type: Number,
      required: [true, 'Vote count is required'],
    },
    currency: {
      type: String,
      default: 'GHS',
    },
    description: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    indexes: [{ awardId: 1 }, { isActive: 1 }],
  }
);

const BulkVotePackage: Model<IBulkVotePackage> =
  mongoose.models.BulkVotePackage ||
  mongoose.model<IBulkVotePackage>('BulkVotePackage', BulkVotePackageSchema);

export default BulkVotePackage;
