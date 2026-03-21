import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISharedCode {
  code: string;
  sharedTo: string;
  sharedVia: 'email' | 'whatsapp';
  sharedAt: Date;
}

export interface ITicketOrder extends Document {
  reference: string;
  eventId: string;
  eventTitle: string;
  eventDate?: string;
  eventTime?: string;
  venueName?: string;
  venueAddress?: string;
  ticketTypeId: string;
  ticketTypeName: string;
  ticketTypeColor: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  status: 'pending' | 'completed' | 'failed';
  ticketCodes: string[];
  sharedCodes: ISharedCode[];
  paymentData?: any;
  createdAt: Date;
  updatedAt: Date;
}

const TicketOrderSchema = new Schema<ITicketOrder>(
  {
    reference: { type: String, required: true, unique: true, index: true },
    eventId: { type: String, required: true, index: true },
    eventTitle: { type: String, required: true },
    eventDate: { type: String },
    eventTime: { type: String },
    venueName: { type: String },
    venueAddress: { type: String },
    ticketTypeId: { type: String, required: true },
    ticketTypeName: { type: String, required: true },
    ticketTypeColor: { type: String, default: '#10b981' },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    buyerName: { type: String, required: true, trim: true },
    buyerEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    buyerPhone: { type: String, required: true, trim: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    ticketCodes: [{ type: String }],
    sharedCodes: [
      {
        code: { type: String, required: true },
        sharedTo: { type: String, required: true },
        sharedVia: { type: String, enum: ['email', 'whatsapp'], required: true },
        sharedAt: { type: Date, default: Date.now },
        _id: false,
      },
    ],
    paymentData: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const TicketOrder: Model<ITicketOrder> =
  (mongoose.models.TicketOrder as Model<ITicketOrder>) ||
  mongoose.model<ITicketOrder>('TicketOrder', TicketOrderSchema);

export default TicketOrder;
