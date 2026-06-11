import { Schema, model, Document } from 'mongoose';

export interface IWorkspace extends Document {
  name: string;
  ownerId: Schema.Types.ObjectId;
  createdAt: Date;
}

const WorkspaceSchema = new Schema<IWorkspace>({
  name: { type: String, required: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

export const Workspace = model<IWorkspace>('Workspace', WorkspaceSchema);
