import Transaction from '../models/Transaction';
import Account from '../models/Account';
import { getPaginationOptions, buildPaginatedResult } from '../utils/pagination';
import { PaginationQuery } from '../types';
import mongoose from 'mongoose';

const adjustAccountBalance = async (
  accountId: string,
  amount: number,
  type: 'add' | 'subtract'
) => {
  const delta = type === 'add' ? amount : -amount;
  await Account.findByIdAndUpdate(accountId, { $inc: { currentBalance: delta } });
};

export const createTransaction = async (userId: string, data: any) => {
  // Strip empty strings from optional ObjectId fields to avoid cast errors
  const OPTIONAL_ID_FIELDS = ['categoryId', 'subCategoryId', 'accountId', 'fromAccountId', 'toAccountId', 'recurringId'];
  const clean = { ...data };
  for (const field of OPTIONAL_ID_FIELDS) {
    if (clean[field] === '' || clean[field] === null) delete clean[field];
  }
  if (Array.isArray(clean.tags)) clean.tags = clean.tags.filter((t: string) => t !== '');

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const tx = await Transaction.create([{ ...clean, userId }], { session });
    const t = tx[0];

    if (t.type === 'income' && t.accountId) {
      await Account.findByIdAndUpdate(t.accountId, { $inc: { currentBalance: t.amount } }, { session });
    } else if (t.type === 'expense' && t.accountId) {
      await Account.findByIdAndUpdate(t.accountId, { $inc: { currentBalance: -t.amount } }, { session });
    } else if (t.type === 'investment' && t.accountId) {
      await Account.findByIdAndUpdate(t.accountId, { $inc: { currentBalance: -t.amount } }, { session });
    } else if (t.type === 'transfer') {
      if (t.fromAccountId) {
        await Account.findByIdAndUpdate(t.fromAccountId, { $inc: { currentBalance: -t.amount } }, { session });
      }
      if (t.toAccountId) {
        await Account.findByIdAndUpdate(t.toAccountId, { $inc: { currentBalance: t.amount } }, { session });
      }
    }

    await session.commitTransaction();
    return Transaction.findById(t._id)
      .populate('accountId categoryId subCategoryId tags fromAccountId toAccountId');
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

export const getTransactions = async (userId: string, query: PaginationQuery) => {
  const { page, limit, skip, sortBy, sortOrder } = getPaginationOptions(query);
  const filter: any = { userId };

  if (query.type) filter.type = query.type;
  if (query.accountId) {
    filter.$or = [
      { accountId: query.accountId },
      { fromAccountId: query.accountId },
      { toAccountId: query.accountId },
    ];
  }
  if (query.categoryId) filter.categoryId = query.categoryId;
  if (query.tagId) filter.tags = query.tagId;
  if (query.startDate || query.endDate) {
    filter.date = {};
    if (query.startDate) filter.date.$gte = new Date(query.startDate);
    if (query.endDate) filter.date.$lte = new Date(query.endDate);
  }
  if (query.search) {
    filter.$or = [
      { notes: { $regex: query.search, $options: 'i' } },
      { incomeSource: { $regex: query.search, $options: 'i' } },
      { toExternal: { $regex: query.search, $options: 'i' } },
      { investmentName: { $regex: query.search, $options: 'i' } },
    ];
  }

  const [data, total] = await Promise.all([
    Transaction.find(filter)
      .populate('accountId', 'name icon color type')
      .populate('categoryId', 'name icon color')
      .populate('subCategoryId', 'name')
      .populate('tags', 'name color')
      .populate('fromAccountId', 'name icon color')
      .populate('toAccountId', 'name icon color')
      .sort({ [sortBy]: sortOrder } as { [key: string]: 1 | -1 })
      .skip(skip)
      .limit(limit),
    Transaction.countDocuments(filter),
  ]);

  return buildPaginatedResult(data, total, page, limit);
};

export const getTransactionById = async (userId: string, id: string) => {
  return Transaction.findOne({ _id: id, userId })
    .populate('accountId categoryId subCategoryId tags fromAccountId toAccountId');
};

export const deleteTransaction = async (userId: string, id: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const t = await Transaction.findOne({ _id: id, userId });
    if (!t) throw new Error('Transaction not found');

    if (t.type === 'income' && t.accountId) {
      await Account.findByIdAndUpdate(t.accountId, { $inc: { currentBalance: -t.amount } }, { session });
    } else if ((t.type === 'expense' || t.type === 'investment') && t.accountId) {
      await Account.findByIdAndUpdate(t.accountId, { $inc: { currentBalance: t.amount } }, { session });
    } else if (t.type === 'transfer') {
      if (t.fromAccountId) await Account.findByIdAndUpdate(t.fromAccountId, { $inc: { currentBalance: t.amount } }, { session });
      if (t.toAccountId) await Account.findByIdAndUpdate(t.toAccountId, { $inc: { currentBalance: -t.amount } }, { session });
    }

    await Transaction.deleteOne({ _id: id }, { session });
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};
