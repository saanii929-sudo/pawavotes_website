import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUssdSession extends Document {
  sessionId: string;
  phoneNumber: string;
  currentStep: string;
  data: {
    awards?: any[];
    categories?: any[];
    nominees?: any[];
    awardId?: string;
    awardName?: string;
    categoryId?: string;
    categoryName?: string;
    nomineeId?: string;
    nomineeName?: string;
    nomineeCode?: string;
    numberOfVotes?: number;
    amount?: number;
    email?: string;
  };
  isActive: boolean;
  lastActivity: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UssdSessionSchema: Schema = new Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      index: true,
    },
    currentStep: {
      type: String,
      required: true,
      default: 'welcome',
    },
    data: {
      awards: [Schema.Types.Mixed],
      categories: [Schema.Types.Mixed],
      nominees: [Schema.Types.Mixed],
      awardId: String,
      awardName: String,
      categoryId: String,
      categoryName: String,
      nomineeId: String,
      nomineeName: String,
      nomineeCode: String,
      numberOfVotes: Number,
      amount: Number,
      email: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-expire sessions after 5 minutes of inactivity
UssdSessionSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 300 });

// Delete cached model before redefining
if (mongoose.models.UssdSession) {
  delete mongoose.models.UssdSession;
}

const UssdSession: Model<IUssdSession> = mongoose.model<IUssdSession>('UssdSession', UssdSessionSchema);

export default UssdSession;
