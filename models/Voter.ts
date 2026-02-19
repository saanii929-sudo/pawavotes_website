import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVoter extends Document {
  electionId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  voterId?: string;
  token: string;
  password: string;
  hasVoted: boolean;
  votedAt?: Date;
  status: 'active' | 'expired' | 'disabled';
  metadata?: {
    department?: string;
    class?: string;
    studentId?: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const VoterSchema: Schema = new Schema(
  {
    electionId: {
      type: Schema.Types.ObjectId,
      ref: 'Election',
      required: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Voter name is required'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      unique: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
      index: true,
    },
    voterId: {
      type: String,
      trim: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    hasVoted: {
      type: Boolean,
      default: false,
    },
    votedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'disabled'],
      default: 'active',
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.Voter) {
  delete mongoose.models.Voter;
}

const Voter: Model<IVoter> = mongoose.model<IVoter>('Voter', VoterSchema);

export default Voter;
