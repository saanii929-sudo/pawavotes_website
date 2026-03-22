import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IJoinRequest extends Document {
  adminId: mongoose.Types.ObjectId;
  adminName: string;
  adminEmail: string;
  organizationId: mongoose.Types.ObjectId;
  organizationName: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const JoinRequestSchema: Schema = new Schema(
  {
    adminId: { type: Schema.Types.ObjectId, ref: 'OrganizationAdmin', required: true },
    adminName: { type: String, required: true },
    adminEmail: { type: String, required: true, lowercase: true, trim: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    organizationName: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  },
  { timestamps: true }
);

// Prevent duplicate pending requests
JoinRequestSchema.index({ adminId: 1, organizationId: 1, status: 1 });

const JoinRequest: Model<IJoinRequest> =
  mongoose.models.JoinRequest ||
  mongoose.model<IJoinRequest>('JoinRequest', JoinRequestSchema);

export default JoinRequest;
