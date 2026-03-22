import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IScanner extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'scanner';
  status: 'active' | 'inactive' | 'suspended';
  assignedEvents: string[];
  createdBy: string;
  createdByRole: 'organization' | 'org-admin' | 'event-organizer';
  createdAt: Date;
  updatedAt: Date;
}

const ScannerSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    phone: { type: String, trim: true },
    role: { type: String, default: 'scanner' },
    status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
    assignedEvents: [{ type: String }],
    createdBy: { type: String, required: true },
    createdByRole: {
      type: String,
      enum: ['organization', 'org-admin', 'event-organizer'],
      required: true,
    },
  },
  { timestamps: true }
);

const Scanner: Model<IScanner> =
  (mongoose.models.Scanner as Model<IScanner>) ||
  mongoose.model<IScanner>('Scanner', ScannerSchema);

export default Scanner;
