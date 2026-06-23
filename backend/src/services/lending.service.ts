import mongoose from 'mongoose';
import Lending from '../models/Lending';
import Account from '../models/Account';
import Transaction from '../models/Transaction';

export const createLending = async (userId: string, data: any) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const lending = await Lending.create([{ ...data, userId }], { session });
    const l = lending[0];

    // 'lent' = money leaves your account (like an expense)
    // 'borrowed' = money enters your account (like income)
    if (l.direction === 'lent') {
      await Account.findByIdAndUpdate(l.accountId, { $inc: { currentBalance: -l.amount } }, { session });
    } else {
      await Account.findByIdAndUpdate(l.accountId, { $inc: { currentBalance: l.amount } }, { session });
    }

    // Also record it as a transaction so it shows in transaction history / analytics
    await Transaction.create(
      [{
        userId,
        type: l.direction === 'lent' ? 'expense' : 'income',
        amount: l.amount,
        date: l.date,
        accountId: l.accountId,
        notes: `${l.direction === 'lent' ? 'Lent to' : 'Borrowed from'} ${l.personName}`,
        incomeSource: l.direction === 'borrowed' ? l.personName : undefined,
      }],
      { session }
    );

    await session.commitTransaction();
    return Lending.findById(l._id).populate('accountId', 'name color icon');
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

export const getLendings = async (userId: string, filters: { status?: string; direction?: string }) => {
  const query: any = { userId };
  if (filters.status) query.status = filters.status;
  if (filters.direction) query.direction = filters.direction;
  return Lending.find(query).populate('accountId', 'name color icon').sort({ date: -1 });
};

export const getLendingSummary = async (userId: string) => {
  const uid = new mongoose.Types.ObjectId(userId);
  const pending = await Lending.find({ userId: uid, status: { $ne: 'settled' } });

  let totalOwedToYou = 0; // you lent, not fully repaid
  let totalYouOwe = 0; // you borrowed, not fully repaid

  for (const l of pending) {
    const remaining = l.amount - l.settledAmount;
    if (l.direction === 'lent') totalOwedToYou += remaining;
    else totalYouOwe += remaining;
  }

  return { totalOwedToYou, totalYouOwe, netPosition: totalOwedToYou - totalYouOwe, pendingCount: pending.length };
};

export const updateLending = async (userId: string, id: string, data: any) => {
  const lending = await Lending.findOneAndUpdate({ _id: id, userId }, data, { new: true })
    .populate('accountId', 'name color icon');
  if (!lending) throw new Error('Lending entry not found');
  return lending;
};

// Settle (fully or partially). When you lent money and it's repaid -> money comes back (income-like).
// When you borrowed money and you repay -> money leaves your account (expense-like).
export const settleLending = async (userId: string, id: string, data: { amount: number; accountId: string; date?: string; notes?: string }) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const lending = await Lending.findOne({ _id: id, userId }).session(session);
    if (!lending) throw new Error('Lending entry not found');

    const remaining = lending.amount - lending.settledAmount;
    if (data.amount > remaining) {
      throw new Error(`Settlement amount exceeds remaining balance of ${remaining}`);
    }

    // Apply balance change on the settlement account
    if (lending.direction === 'lent') {
      // money returns to you
      await Account.findByIdAndUpdate(data.accountId, { $inc: { currentBalance: data.amount } }, { session });
    } else {
      // you're paying back what you borrowed
      await Account.findByIdAndUpdate(data.accountId, { $inc: { currentBalance: -data.amount } }, { session });
    }

    // Record the settlement as a transaction too
    await Transaction.create(
      [{
        userId,
        type: lending.direction === 'lent' ? 'income' : 'expense',
        amount: data.amount,
        date: data.date || new Date(),
        accountId: data.accountId,
        notes: data.notes || `${lending.direction === 'lent' ? 'Repayment from' : 'Repaid to'} ${lending.personName}`,
        incomeSource: lending.direction === 'lent' ? lending.personName : undefined,
      }],
      { session }
    );

    lending.settledAmount += data.amount;
    lending.status = lending.settledAmount >= lending.amount ? 'settled' : 'partially_settled';
    await lending.save({ session });

    await session.commitTransaction();
    return Lending.findById(id).populate('accountId', 'name color icon');
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

export const deleteLending = async (userId: string, id: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const lending = await Lending.findOne({ _id: id, userId }).session(session);
    if (!lending) throw new Error('Lending entry not found');

    // Reverse only the UNSETTLED portion's effect on the original account
    const unsettledAmount = lending.amount - lending.settledAmount;
    if (unsettledAmount > 0) {
      if (lending.direction === 'lent') {
        // money was deducted originally; give it back since we're deleting the record
        await Account.findByIdAndUpdate(lending.accountId, { $inc: { currentBalance: unsettledAmount } }, { session });
      } else {
        await Account.findByIdAndUpdate(lending.accountId, { $inc: { currentBalance: -unsettledAmount } }, { session });
      }
    }

    await Lending.deleteOne({ _id: id }, { session });
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};
