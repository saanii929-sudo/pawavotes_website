import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITicketType {
  id: string;
  name: string;
  description?: string;
  price: number;
  capacity: number;
  sold: number;
  color: string;
  perks?: string[];
}

export interface IEvent extends Document {
  title: string;
  description?: string;
  code: string;
  organizationId: string;
  organizationName: string;
  category: 'conference' | 'concert' | 'sports' | 'workshop' | 'gala' | 'festival' | 'networking' | 'other';
  status: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';
  banner?: string;
  ticketBg?: string;
  ticketTextColor?: string;
  venue: {
    name: string;
    address?: string;
    city?: string;
    country?: string;
    isVirtual?: boolean;
    virtualLink?: string;
  };
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  ticketTypes: ITicketType[];
  totalCapacity: number;
  totalSold: number;
  totalRevenue: number;
  createdBy: string;
  settings: {
    requireApproval: boolean;
    showAttendeeCount: boolean;
    allowRefunds: boolean;
    isPublic: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const TicketTypeSchema = new Schema<ITicketType>(
  {
    id: { type: String },
    name: { type: String, default: 'General Admission' },
    description: { type: String, default: '' },
    price: { type: Number, default: 0 },
    capacity: { type: Number, default: 100 },
    sold: { type: Number, default: 0 },
    color: { type: String, default: '#10b981' },
    perks: [String],
  },
  { _id: false }
);

const EventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    code: { type: String, unique: true, sparse: true, uppercase: true },
    organizationId: { type: String, required: true, index: true },
    organizationName: { type: String, required: true },
    category: {
      type: String,
      enum: ['conference', 'concert', 'sports', 'workshop', 'gala', 'festival', 'networking', 'other'],
      default: 'other',
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'ongoing', 'completed', 'cancelled'],
      default: 'draft',
    },
    banner: { type: String, default: '' },
    ticketBg: { type: String, default: '' },
    ticketTextColor: { type: String, default: 'light' }, // 'light' | 'dark'
    venue: {
      name: { type: String, default: '' },
      address: { type: String, default: '' },
      city: { type: String, default: '' },
      country: { type: String, default: '' },
      isVirtual: { type: Boolean, default: false },
      virtualLink: { type: String, default: '' },
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    startTime: { type: String, default: '09:00' },
    endTime: { type: String, default: '17:00' },
    ticketTypes: { type: [TicketTypeSchema], default: [] },
    totalCapacity: { type: Number, default: 0 },
    totalSold: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    createdBy: { type: String, required: true },
    settings: {
      requireApproval: { type: Boolean, default: false },
      showAttendeeCount: { type: Boolean, default: true },
      allowRefunds: { type: Boolean, default: false },
      isPublic: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

EventSchema.index({ organizationId: 1, status: 1 });
EventSchema.index({ startDate: 1 });

function generateEventCode(title: string): string {
  const words = title.trim().split(/\s+/);
  const prefix = words
    .map((w) => w.charAt(0).toUpperCase())
    .join('')
    .slice(0, 4);
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${suffix}`;
}

EventSchema.pre('save', async function () {
  if (!this.code) {
    this.code = generateEventCode(this.title || 'EV');
  }
  if (Array.isArray(this.ticketTypes)) {
    this.totalCapacity = this.ticketTypes.reduce((sum, t) => sum + (t.capacity || 0), 0);
    this.totalSold = this.ticketTypes.reduce((sum, t) => sum + (t.sold || 0), 0);
    this.totalRevenue = this.ticketTypes.reduce((sum, t) => sum + ((t.sold || 0) * (t.price || 0)), 0);
  }
});

// Delete cached model to allow hot-reload in dev
const EventModel: Model<IEvent> =
  (mongoose.models.Event as Model<IEvent>) ||
  mongoose.model<IEvent>('Event', EventSchema);

export default EventModel;
