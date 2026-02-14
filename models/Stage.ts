import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStage extends Document {
  name: string;
  awardId: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  order: number;
  stageType: 'nomination' | 'voting' | 'results';
  status: 'upcoming' | 'active' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

const StageSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Stage name is required'],
      trim: true,
    },
    awardId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Award ID is required'],
      ref: 'Award',
    },
    description: String,
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    order: {
      type: Number,
      required: true,
    },
    stageType: {
      type: String,
      enum: ['nomination', 'voting', 'results'],
      required: true,
    },
    status: {
      type: String,
      enum: ['upcoming', 'active', 'completed'],
      default: 'upcoming',
    },
  },
  {
    timestamps: true,
    indexes: [{ awardId: 1 }, { order: 1 }, { status: 1 }],
  }
);

const Stage: Model<IStage> =
  mongoose.models.Stage || mongoose.model<IStage>('Stage', StageSchema);

export default Stage;
