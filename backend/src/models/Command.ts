import { Schema, model, Document } from 'mongoose';

export interface ICommand extends Document {
  prompt: string;
  success: boolean;
  affectedRows: number;
  newRows: number;
  columnsChanged: string[];
  explanation: string;
  userId: Schema.Types.ObjectId;
  fileId?: Schema.Types.ObjectId;
  timestamp: Date;
}

const CommandSchema = new Schema<ICommand>({
  prompt: { type: String, required: true },
  success: { type: Boolean, required: true },
  affectedRows: { type: Number, default: 0 },
  newRows: { type: Number, default: 0 },
  columnsChanged: [{ type: String }],
  explanation: { type: String },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  fileId: { type: Schema.Types.ObjectId, ref: 'File' },
  timestamp: { type: Date, default: Date.now }
});

export const Command = model<ICommand>('Command', CommandSchema);
