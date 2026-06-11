import { Schema, model, Document } from 'mongoose';

export interface IWorkflowStep {
  type: string;
  params: Record<string, any>;
  description: string;
}

export interface IWorkflow extends Document {
  name: string;
  description?: string;
  steps: IWorkflowStep[];
  userId: Schema.Types.ObjectId;
  createdAt: Date;
}

const WorkflowStepSchema = new Schema<IWorkflowStep>({
  type: { type: String, required: true },
  params: { type: Schema.Types.Mixed, required: true },
  description: { type: String, required: true }
}, { _id: false });

const WorkflowSchema = new Schema<IWorkflow>({
  name: { type: String, required: true },
  description: { type: String },
  steps: [WorkflowStepSchema],
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

export const Workflow = model<IWorkflow>('Workflow', WorkflowSchema);
