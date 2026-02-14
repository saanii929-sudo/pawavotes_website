import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IChatMessage extends Document {
  sessionId: string;
  userId?: string;
  userType?: 'guest' | 'organization' | 'org-admin' | 'voter';
  message: string;
  response: string;
  intent?: string;
  confidence?: number;
  resolved: boolean;
  escalated: boolean;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema: Schema = new Schema(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      index: true,
    },
    userType: {
      type: String,
      enum: ['guest', 'organization', 'org-admin', 'voter'],
      default: 'guest',
    },
    message: {
      type: String,
      required: true,
    },
    response: {
      type: String,
      required: true,
    },
    intent: {
      type: String,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },
    resolved: {
      type: Boolean,
      default: false,
    },
    escalated: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Delete cached model before redefining
if (mongoose.models.ChatMessage) {
  delete mongoose.models.ChatMessage;
}

const ChatMessage: Model<IChatMessage> = mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);

export default ChatMessage;
