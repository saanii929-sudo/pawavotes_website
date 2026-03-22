import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITicketScan extends Document {
  ticketCode: string;
  orderId: string;
  eventId: string;
  eventTitle: string;
  scannerId: string;
  scannerName: string;
  buyerName: string;
  ticketTypeName: string;
  action: 'check-in' | 'check-out';
  createdAt: Date;
}

const TicketScanSchema: Schema = new Schema(
  {
    ticketCode: { type: String, required: true, index: true },
    orderId: { type: String, required: true },
    eventId: { type: String, required: true, index: true },
    eventTitle: { type: String, default: '' },
    scannerId: { type: String, required: true, index: true },
    scannerName: { type: String, required: true },
    buyerName: { type: String, default: '' },
    ticketTypeName: { type: String, default: '' },
    action: { type: String, enum: ['check-in', 'check-out'], required: true },
  },
  { timestamps: true }
);

const TicketScan: Model<ITicketScan> =
  (mongoose.models.TicketScan as Model<ITicketScan>) ||
  mongoose.model<ITicketScan>('TicketScan', TicketScanSchema);

export default TicketScan;
