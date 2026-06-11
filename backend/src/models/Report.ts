import { Schema, model, Document } from 'mongoose';

export interface IReport extends Document {
  title: string;
  type: 'sales' | 'customer' | 'recruitment' | 'inventory' | 'custom';
  summaryText: string;
  data: Record<string, any>[];
  userId: Schema.Types.ObjectId;
  createdAt: Date;
}

const ReportSchema = new Schema<IReport>({
  title: { type: String, required: true },
  type: { type: String, enum: ['sales', 'customer', 'recruitment', 'inventory', 'custom'], required: true },
  summaryText: { type: String, required: true },
  data: [{ type: Schema.Types.Mixed }],
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

export const Report = model<IReport>('Report', ReportSchema);
