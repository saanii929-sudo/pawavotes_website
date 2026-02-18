import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRanking {
  nomineeId: string;
  nomineeName: string;
  rank: number;
  voteCount: number;
  qualified: boolean;
  lastVoteAt?: Date;
}

export interface IStageResult extends Document {
  stageId: string;
  awardId: string;
  categoryId: string;
  rankings: IRanking[];
  totalVotes: number;
  snapshotAt: Date;
  immutable: boolean;
  createdAt: Date;
}

const RankingSchema: Schema = new Schema(
  {
    nomineeId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Nominee ID is required'],
      ref: 'Nominee',
    },
    nomineeName: {
      type: String,
      required: [true, 'Nominee name is required'],
    },
    rank: {
      type: Number,
      required: [true, 'Rank is required'],
      min: 1,
    },
    voteCount: {
      type: Number,
      required: [true, 'Vote count is required'],
      min: 0,
    },
    qualified: {
      type: Boolean,
      default: false,
    },
    lastVoteAt: {
      type: Date,
    },
  },
  { _id: false }
);

const StageResultSchema: Schema = new Schema(
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
    rankings: {
      type: [RankingSchema],
      required: true,
      default: [],
    },
    totalVotes: {
      type: Number,
      required: [true, 'Total votes is required'],
      min: 0,
      default: 0,
    },
    snapshotAt: {
      type: Date,
      default: Date.now,
    },
    immutable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

StageResultSchema.index({ stageId: 1, categoryId: 1 });
StageResultSchema.pre('save', function () {
  if (this.isNew) {
    return;
  }
  if (this.immutable) {
    throw new Error('Cannot modify immutable stage result');
  }
});

StageResultSchema.pre('findOneAndUpdate', function () {
  const update = this.getUpdate() as any;
  if (update && update.$set && update.$set.immutable === false) {
    throw new Error('Cannot modify immutable stage result');
  }
});

const StageResult: Model<IStageResult> =
  mongoose.models.StageResult ||
  mongoose.model<IStageResult>('StageResult', StageResultSchema);

export default StageResult;
