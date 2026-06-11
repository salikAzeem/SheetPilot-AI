import { Schema, model, Document } from 'mongoose';

export interface IGoogleSheets extends Document {
  userId: Schema.Types.ObjectId;
  googleEmail: string;
  accessToken: string;
  refreshToken?: string;
  expiryDate?: number;
  connectedAt: Date;
}

const GoogleSheetsSchema = new Schema<IGoogleSheets>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  googleEmail: { type: String, required: true },
  accessToken: { type: String, required: true },
  refreshToken: { type: String },
  expiryDate: { type: Number },
  connectedAt: { type: Date, default: Date.now }
});

export const GoogleSheets = model<IGoogleSheets>('GoogleSheets', GoogleSheetsSchema);
