import { Schema, model, Document } from 'mongoose';

export interface IActivityLog extends Document {
  userId: Schema.Types.ObjectId;
  action: string;
  details?: string;
  ipAddress?: string;
  timestamp: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  details: { type: String },
  ipAddress: { type: String },
  timestamp: { type: Date, default: Date.now }
});

export const ActivityLog = model<IActivityLog>('ActivityLog', ActivityLogSchema);
