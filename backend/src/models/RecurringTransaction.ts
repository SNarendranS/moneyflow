import mongoose, { Document, Schema } from 'mongoose';
import { FrequencyType, TransactionType } from '../types';

export interface IRecurringTransaction extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  amount: number;
  transactionType: TransactionType;
  frequencyType: FrequencyType;
  customDays?: number;
  nextDueDate: Date;
  accountId: mongoose.Types.ObjectId;
  categoryId?: mongoose.Types.ObjectId;
  notes?: string;
  isActive: boolean;
  lastProcessedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const recurringSchema = new Schema<IRecurringTransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    transactionType: {
      type: String,
      enum: ['income', 'expense', 'transfer', 'investment'],
      required: true,
    },
    frequencyType: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly', 'custom'],
      required: true,
    },
    customDays: { type: Number, min: 1 },
    nextDueDate: { type: Date, required: true },
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
    notes: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    lastProcessedDate: { type: Date },
  },
  { timestamps: true }
);

recurringSchema.index({ userId: 1, nextDueDate: 1 });

export default mongoose.model<IRecurringTransaction>('RecurringTransaction', recurringSchema);
