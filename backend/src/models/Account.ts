import mongoose, { Document, Schema } from 'mongoose';
import { AccountType } from '../types';

export interface IAccount extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  type: AccountType;
  openingBalance: number;
  currentBalance: number;
  color: string;
  icon: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const accountSchema = new Schema<IAccount>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['salary', 'savings', 'cash', 'wallet', 'credit_card'],
      required: true,
    },
    openingBalance: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    color: { type: String, default: '#6366f1' },
    icon: { type: String, default: 'wallet' },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

accountSchema.index({ userId: 1, isArchived: 1 });

export default mongoose.model<IAccount>('Account', accountSchema);
