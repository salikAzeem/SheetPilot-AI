import { Schema, model, Document } from 'mongoose';

export interface IFile extends Document {
  name: string;
  type: 'csv' | 'xlsx' | 'google';
  sizeBytes?: number;
  rowCount?: number;
  columnCount?: number;
  columns: string[];
  data: Record<string, any>[];
  googleSheetId?: string;
  userId: Schema.Types.ObjectId;
  createdAt: Date;
}

const FileSchema = new Schema<IFile>({
  name: { type: String, required: true },
  type: { type: String, enum: ['csv', 'xlsx', 'google'], required: true },
  sizeBytes: { type: Number },
  rowCount: { type: Number },
  columnCount: { type: Number },
  columns: [{ type: String }],
  data: [Schema.Types.Mixed],
  googleSheetId: { type: String },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

export const FileModel = model<IFile>('File', FileSchema);
