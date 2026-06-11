import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  googleId?: string;
  picture?: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  googleId: { type: String },
  picture: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export const User = model<IUser>('User', UserSchema);
