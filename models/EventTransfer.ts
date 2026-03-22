import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEventTransfer extends Document {
  referenceId: string;
  eventId: string;
  ownerId: string;      // Organization._id or EventOrganizer._id
  ownerRole: 'organization' | 'event-organizer';
  amount: number;
  platformFee: number;
  totalRevenue: number;
  currency: string;
  recipientName: string;
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
  createdAt: Date;
  updatedAt: Date;
}

const EventTransferSchema: Schema = new Schema(
  {
    referenceId: { type: String, required: true, unique: true },
    eventId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    ownerRole: { type: String, enum: ['organization', 'event-organizer'], required: true },
    amount: { type: Number, required: true },
    platformFee: { type: Number, required: true, default: 0 },
    totalRevenue: { type: Number, required: true, default: 0 },
    currency: { type: String, default: 'GHS' },
    recipientName: { type: String, required: true },
    recipientBank: String,
    recipientAccountNumber: String,
    recipientPhoneNumber: String,
    momoNetwork: String,
    transferType: { type: String, enum: ['bank', 'mobile_money'], required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed', 'failed'],
      default: 'pending',
    },
    initiatedBy: { type: String, required: true },
    approvedBy: String,
    approvedAt: Date,
    rejectedBy: String,
    rejectedAt: Date,
    rejectionReason: String,
    notes: String,
  },
  { timestamps: true }
);

const EventTransfer: Model<IEventTransfer> =
  (mongoose.models.EventTransfer as Model<IEventTransfer>) ||
  mongoose.model<IEventTransfer>('EventTransfer', EventTransferSchema);

export default EventTransfer;
