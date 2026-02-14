import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INomineeCampaign extends Document {
  nomineeId: string;
  awardId: string;
  categoryId: string;
  organizationId: string;
  campaignName: string;
  description: string;
  goalAmount?: number;
  currentAmount: number;
  supporters: Array<{
    name: string;
    email: string;
    phone?: string;
    amount?: number;
    joinedAt: Date;
  }>;
  socialMedia: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    tiktok?: string;
  };
  emailCampaigns: Array<{
    subject: string;
    content: string;
    sentAt: Date;
    recipientCount: number;
  }>;
  scheduledPosts: Array<{
    platform: string;
    content: string;
    scheduledFor: Date;
    posted: boolean;
    postedAt?: Date;
  }>;
  analytics: {
    views: number;
    clicks: number;
    shares: number;
    donations: number;
  };
  status: 'draft' | 'active' | 'paused' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

const NomineeCampaignSchema: Schema = new Schema(
  {
    nomineeId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Nominee',
      index: true,
    },
    awardId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Award',
      index: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Category',
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Organization',
      index: true,
    },
    campaignName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    goalAmount: {
      type: Number,
      min: 0,
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    supporters: [
      {
        name: String,
        email: String,
        phone: String,
        amount: Number,
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    socialMedia: {
      facebook: String,
      twitter: String,
      instagram: String,
      tiktok: String,
    },
    emailCampaigns: [
      {
        subject: String,
        content: String,
        sentAt: Date,
        recipientCount: Number,
      },
    ],
    scheduledPosts: [
      {
        platform: String,
        content: String,
        scheduledFor: Date,
        posted: {
          type: Boolean,
          default: false,
        },
        postedAt: Date,
      },
    ],
    analytics: {
      views: {
        type: Number,
        default: 0,
      },
      clicks: {
        type: Number,
        default: 0,
      },
      shares: {
        type: Number,
        default: 0,
      },
      donations: {
        type: Number,
        default: 0,
      },
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'completed'],
      default: 'draft',
    },
  },
  {
    timestamps: true,
  }
);

// Delete cached model before redefining
if (mongoose.models.NomineeCampaign) {
  delete mongoose.models.NomineeCampaign;
}

const NomineeCampaign: Model<INomineeCampaign> = mongoose.model<INomineeCampaign>(
  'NomineeCampaign',
  NomineeCampaignSchema
);

export default NomineeCampaign;
