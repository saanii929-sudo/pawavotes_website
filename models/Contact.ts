import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IContact extends Document {
  fullName: string;
  email: string;
  subject: string;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema: Schema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Delete cached model before redefining
if (mongoose.models.Contact) {
  delete mongoose.models.Contact;
}

const Contact: Model<IContact> = mongoose.model<IContact>('Contact', ContactSchema);

export default Contact;
