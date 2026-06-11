import { Schema, model, Document } from 'mongoose';

export interface IAuditLog extends Document {
  userId: Schema.Types.ObjectId;
  fileId?: Schema.Types.ObjectId;
  action: string;
  affectedRows: number;
  changesApplied: string[];
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  fileId: { type: Schema.Types.ObjectId, ref: 'File' },
  action: { type: String, required: true },
  affectedRows: { type: Number, default: 0 },
  changesApplied: [{ type: String }],
  timestamp: { type: Date, default: Date.now }
});

export const AuditLog = model<IAuditLog>('AuditLog', AuditLogSchema);
