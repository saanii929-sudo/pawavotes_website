import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITransfer extends Document {
  referenceId: string;
  awardId: string;
  organizationId: string;
  amount: number;
  platformFee: number;
  totalRevenue: number;
  currency: string;
  recipientName: string;
  recipientCode?: string;
  recipientBank?: string;
  recipientAccountNumber?: string;
  recipientPhoneNumber?: string;
  momoNetwork?: string;
  transferType: 'bank' | 'mobile_money';
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';
  initiatedBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  notes?: string;
  hubtelData?: any;
  createdAt: Date;
  updatedAt: Date;
}

const TransferSchema: Schema = new Schema(
  {
    referenceId: {
      type: String,
      required: [true, 'Reference ID is required'],
      unique: true,
    },
    awardId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Award ID is required'],
      ref: 'Award',
    },
    organizationId: {
      type: String,
      required: [true, 'Organization ID is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
    },
    platformFee: {
      type: Number,
      required: true,
      default: 0,
    },
    totalRevenue: {
      type: Number,
      required: true,
      default: 0,
    },
    currency: {
      type: String,
      default: 'GHS',
    },
    recipientName: {
      type: String,
      required: [true, 'Recipient name is required'],
    },
    recipientCode: {
      type: String,
    },
    recipientBank: String,
    recipientAccountNumber: String,
    recipientPhoneNumber: String,
    momoNetwork: String,
    transferType: {
      type: String,
      enum: ['bank', 'mobile_money'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed', 'failed'],
      default: 'pending',
    },
    initiatedBy: {
      type: String,
      required: true,
    },
    approvedBy: String,
    approvedAt: Date,
    rejectedBy: String,
    rejectedAt: Date,
    rejectionReason: String,
    notes: String,
    hubtelData: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    indexes: [{ awardId: 1 }, { organizationId: 1 }, { status: 1 }, { createdAt: 1 }],
  }
);

// Delete the cached model to ensure we use the latest schema
if (mongoose.models.Transfer) {
  delete mongoose.models.Transfer;
}

const Transfer: Model<ITransfer> = mongoose.model<ITransfer>('Transfer', TransferSchema);

export default Transfer;
