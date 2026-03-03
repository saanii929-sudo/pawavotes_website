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
    paymentReference?: string;
    otpAttempts?: number;
    confirmedNetwork?: string;
    confirmedHighVote?: boolean;
    tempVotes?: number;
    currentPage?: number;
    totalPages?: number;
    pageStartIndex?: number;
    errorCount?: number;
    awardCache?: any;
    [key: string]: any; // Allow additional dynamic fields
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
      type: Schema.Types.Mixed,
      default: {},
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

// Auto-expire sessions after 15 minutes of inactivity
UssdSessionSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 900 });

// Delete cached model before redefining
if (mongoose.models.UssdSession) {
  delete mongoose.models.UssdSession;
}

const UssdSession: Model<IUssdSession> = mongoose.model<IUssdSession>('UssdSession', UssdSessionSchema);

export default UssdSession;
