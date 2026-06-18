import mongoose, { Document, Schema } from 'mongoose';
import { TransactionType, InvestmentType } from '../types';

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  type: TransactionType;
  amount: number;
  date: Date;
  notes?: string;
  // Income/Expense/Investment
  accountId?: mongoose.Types.ObjectId;
  // Expense
  categoryId?: mongoose.Types.ObjectId;
  subCategoryId?: mongoose.Types.ObjectId;
  tags?: mongoose.Types.ObjectId[];
  // Transfer
  fromAccountId?: mongoose.Types.ObjectId;
  toAccountId?: mongoose.Types.ObjectId;
  toExternal?: string; // e.g. "Mother", "Friend"
  // Investment
  investmentType?: InvestmentType;
  investmentName?: string;
  // Income source label
  incomeSource?: string;
  // Recurring link
  recurringId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['income', 'expense', 'transfer', 'investment'], required: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true, default: Date.now },
    notes: { type: String, trim: true },
    accountId: { type: Schema.Types.ObjectId, ref: 'Account' },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
    subCategoryId: { type: Schema.Types.ObjectId, ref: 'Subcategory' },
    tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
    fromAccountId: { type: Schema.Types.ObjectId, ref: 'Account' },
    toAccountId: { type: Schema.Types.ObjectId, ref: 'Account' },
    toExternal: { type: String, trim: true },
    investmentType: {
      type: String,
      enum: ['sip', 'mutual_fund', 'stock', 'fd', 'other'],
    },
    investmentName: { type: String, trim: true },
    incomeSource: { type: String, trim: true },
    recurringId: { type: Schema.Types.ObjectId, ref: 'RecurringTransaction' },
  },
  { timestamps: true }
);

transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, type: 1, date: -1 });
transactionSchema.index({ userId: 1, categoryId: 1, date: -1 });
transactionSchema.index({ userId: 1, accountId: 1, date: -1 });

export default mongoose.model<ITransaction>('Transaction', transactionSchema);
