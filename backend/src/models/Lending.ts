import mongoose, { Document, Schema } from 'mongoose';

export type LendingDirection = 'lent' | 'borrowed'; // lent = you gave money out; borrowed = you took money in
export type LendingStatus = 'pending' | 'partially_settled' | 'settled';

export interface ILending extends Document {
  userId: mongoose.Types.ObjectId;
  direction: LendingDirection;
  personName: string;
  amount: number;
  settledAmount: number;
  accountId: mongoose.Types.ObjectId; // account money moved from/to
  date: Date; // date the loan was given/taken
  expectedReturnDate?: Date;
  notes?: string;
  status: LendingStatus;
  createdAt: Date;
  updatedAt: Date;
}

const lendingSchema = new Schema<ILending>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    direction: { type: String, enum: ['lent', 'borrowed'], required: true },
    personName: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    settledAmount: { type: Number, default: 0 },
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    date: { type: Date, required: true, default: Date.now },
    expectedReturnDate: { type: Date },
    notes: { type: String, trim: true },
    status: { type: String, enum: ['pending', 'partially_settled', 'settled'], default: 'pending' },
  },
  { timestamps: true }
);

lendingSchema.index({ userId: 1, status: 1 });
lendingSchema.index({ userId: 1, direction: 1 });

export default mongoose.model<ILending>('Lending', lendingSchema);
