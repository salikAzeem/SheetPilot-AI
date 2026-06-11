import { Schema, model, Document } from 'mongoose';

export interface ISubscription extends Document {
  userId: Schema.Types.ObjectId;
  plan: 'free' | 'pro';
  commandsUsedThisMonth: number;
  limitResetDate: Date;
  status: 'active' | 'canceled';
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  plan: { type: String, enum: ['free', 'pro'], default: 'free' },
  commandsUsedThisMonth: { type: Number, default: 0 },
  limitResetDate: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
  status: { type: String, enum: ['active', 'canceled'], default: 'active' },
  updatedAt: { type: Date, default: Date.now }
});

export const Subscription = model<ISubscription>('Subscription', SubscriptionSchema);
