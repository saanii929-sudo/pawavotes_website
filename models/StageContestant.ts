import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStageContestant extends Document {
  stageId: string;
  awardId: string;
  categoryId: string;
  nomineeId: string;
  addedBy: 'manual' | 'qualification' | 'initial';
  addedAt: Date;
  sourceStageId?: string;
  createdAt: Date;
}

const StageContestantSchema: Schema = new Schema(
  {
    stageId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Stage ID is required'],
      ref: 'Stage',
      index: true,
    },
    awardId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Award ID is required'],
      ref: 'Award',
      index: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Category ID is required'],
      ref: 'Category',
      index: true,
    },
    nomineeId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Nominee ID is required'],
      ref: 'Nominee',
      index: true,
    },
    addedBy: {
      type: String,
      enum: ['manual', 'qualification', 'initial'],
      required: [true, 'Added by is required'],
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
    sourceStageId: {
      type: Schema.Types.ObjectId,
      ref: 'Stage',
    },
  },
  {
    timestamps: true,
  }
);
StageContestantSchema.index({ stageId: 1, nomineeId: 1 }, { unique: true });
StageContestantSchema.index({ stageId: 1, categoryId: 1 });

const StageContestant: Model<IStageContestant> =
  mongoose.models.StageContestant ||
  mongoose.model<IStageContestant>('StageContestant', StageContestantSchema);

export default StageContestant;
