import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOrganizationAdmin extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: 'admin';
  status: 'pending' | 'active' | 'inactive';
  assignedAwards: mongoose.Types.ObjectId[];
  invitationToken?: string;
  invitationExpiry?: Date;
  invitedBy: mongoose.Types.ObjectId;
  resetPasswordToken?: string;
  resetPasswordExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationAdminSchema: Schema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
    },
    role: {
      type: String,
      default: 'admin',
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'inactive'],
      default: 'pending',
    },
    assignedAwards: [{
      type: Schema.Types.ObjectId,
      ref: 'Award',
    }],
    invitationToken: {
      type: String,
    },
    invitationExpiry: {
      type: Date,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpiry: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Delete existing model if it exists
if (mongoose.models.OrganizationAdmin) {
  delete mongoose.models.OrganizationAdmin;
}

const OrganizationAdmin: Model<IOrganizationAdmin> = mongoose.model<IOrganizationAdmin>(
  'OrganizationAdmin',
  OrganizationAdminSchema
);

export default OrganizationAdmin;
