import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPendingNomination extends Document {
  reference: string;
  awardId: string;
  categoryId: string;
  name: string;
  email: string;
  phone?: string;
  bio?: string;
  image?: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  paymentData?: any;
  createdAt: Date;
  updatedAt: Date;
}

const PendingNominationSchema: Schema = new Schema(
  {
    reference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    awardId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Award',
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Category',
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: String,
    bio: String,
    image: String,
    amount: {
      type: Number,
      required: true,
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

// Auto-delete pending nominations after 24 hours
PendingNominationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

const PendingNomination: Model<IPendingNomination> =
  mongoose.models.PendingNomination || mongoose.model<IPendingNomination>('PendingNomination', PendingNominationSchema);

export default PendingNomination;
