import Transaction from '../models/Transaction';
import Account from '../models/Account';
import { Category, Subcategory } from '../models/Category';
import Tag from '../models/Tag';
import { getPaginationOptions, buildPaginatedResult } from '../utils/pagination';
import { PaginationQuery } from '../types';
import mongoose from 'mongoose';

const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const MONTH_MAP: Record<string, string> = {
  jan: '01', january: '01',
  feb: '02', february: '02',
  mar: '03', march: '03',
  apr: '04', april: '04',
  may: '05',
  jun: '06', june: '06',
  jul: '07', july: '07',
  aug: '08', august: '08',
  sep: '09', september: '09',
  oct: '10', october: '10',
  nov: '11', november: '11',
  dec: '12', december: '12',
};

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

    // After committing, check if the account dips into locked (goal) funds — attach warning
    const result = await Transaction.findById(t._id)
      .populate('accountId categoryId subCategoryId tags fromAccountId toAccountId') as any;

    let goalWarning: string | null = null;
    const checkAccountId = t.accountId || t.fromAccountId;
    if (checkAccountId && (t.type === 'expense' || t.type === 'transfer')) {
      const acc = await Account.findById(checkAccountId);
      if (acc && acc.lockedAmount > 0 && acc.currentBalance < acc.lockedAmount) {
        goalWarning = `⚠️ Warning: Your ${acc.name} balance (₹${acc.currentBalance.toLocaleString()}) is now below its locked goal amount (₹${acc.lockedAmount.toLocaleString()}). This transaction used funds reserved for a goal.`;
      }
    }

    return { transaction: result, goalWarning };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

export const getTransactions = async (userId: string, query: PaginationQuery) => {
  const { page, limit, skip, sortBy, sortOrder } = getPaginationOptions(query, 'date');
  const andConditions: any[] = [{ userId }];

  // 1. Transaction Type filter
  if (query.type && query.type !== 'all') {
    andConditions.push({ type: query.type });
  }

  // 2. Dynamic Account filter (matches accountId, fromAccountId, or toAccountId)
  if (query.accountId && query.accountId !== 'all') {
    if (mongoose.Types.ObjectId.isValid(query.accountId)) {
      const accId = new mongoose.Types.ObjectId(query.accountId);
      andConditions.push({
        $or: [
          { accountId: accId },
          { fromAccountId: accId },
          { toAccountId: accId },
        ],
      });
    }
  }

  // 3. Category filter
  if (query.categoryId && query.categoryId !== 'all') {
    if (mongoose.Types.ObjectId.isValid(query.categoryId)) {
      andConditions.push({ categoryId: new mongoose.Types.ObjectId(query.categoryId) });
    }
  }

  // 4. Tag filter
  if (query.tagId && query.tagId !== 'all') {
    if (mongoose.Types.ObjectId.isValid(query.tagId)) {
      andConditions.push({ tags: new mongoose.Types.ObjectId(query.tagId) });
    }
  }

  // 5. Date Range filter (transaction date)
  if (query.startDate || query.endDate) {
    const dateFilter: any = {};
    if (query.startDate) {
      dateFilter.$gte = new Date(query.startDate);
    }
    if (query.endDate) {
      const end = new Date(query.endDate);
      if (typeof query.endDate === 'string' && query.endDate.length <= 10) {
        end.setHours(23, 59, 59, 999);
      }
      dateFilter.$lte = end;
    }
    andConditions.push({ date: dateFilter });
  }

  // 6. Amount Range filter
  if (query.minAmount !== undefined && query.minAmount !== '' && !isNaN(Number(query.minAmount))) {
    andConditions.push({ amount: { $gte: Number(query.minAmount) } });
  }
  if (query.maxAmount !== undefined && query.maxAmount !== '' && !isNaN(Number(query.maxAmount))) {
    andConditions.push({ amount: { $lte: Number(query.maxAmount) } });
  }

  // 7. Search filter (cross-field: caption/notes, type, amount, category, date, account, tags, incomeSource, toExternal, investmentName)
  if (query.search && query.search.trim()) {
    const rawSearch = query.search.trim();
    const escaped = escapeRegex(rawSearch);
    const regex = { $regex: escaped, $options: 'i' };

    const searchOr: any[] = [
      // Caption / notes
      { notes: regex },
      // Other text fields
      { incomeSource: regex },
      { toExternal: regex },
      { investmentName: regex },
      // Type (matches 'income', 'expense', 'transfer', 'investment' or substrings)
      { type: regex },
    ];

    // Category and Subcategory matching by name
    const [matchedCategories, matchedSubcategories] = await Promise.all([
      Category.find({ userId, name: regex }).select('_id'),
      Subcategory.find({ userId, name: regex }).select('_id'),
    ]);
    if (matchedCategories.length > 0) {
      searchOr.push({ categoryId: { $in: matchedCategories.map((c) => c._id) } });
    }
    if (matchedSubcategories.length > 0) {
      searchOr.push({ subCategoryId: { $in: matchedSubcategories.map((s) => s._id) } });
    }

    // Account name matching
    const matchedAccounts = await Account.find({ userId, name: regex }).select('_id');
    if (matchedAccounts.length > 0) {
      const accIds = matchedAccounts.map((a) => a._id);
      searchOr.push(
        { accountId: { $in: accIds } },
        { fromAccountId: { $in: accIds } },
        { toAccountId: { $in: accIds } }
      );
    }

    // Tag name matching
    const matchedTags = await Tag.find({ userId, name: regex }).select('_id');
    if (matchedTags.length > 0) {
      searchOr.push({ tags: { $in: matchedTags.map((t) => t._id) } });
    }

    // Amount matching (numeric substring match or direct number match)
    const numericClean = rawSearch.replace(/[^0-9.]/g, '');
    if (numericClean.length > 0) {
      searchOr.push({
        $expr: {
          $regexMatch: {
            input: { $toString: { $ifNull: ['$amount', 0] } },
            regex: escapeRegex(numericClean),
            options: 'i',
          },
        },
      });
      const parsedNum = Number(numericClean);
      if (!isNaN(parsedNum)) {
        searchOr.push({ amount: parsedNum });
      }
    }

    // Date matching (string representation of date: YYYY-MM-DD and DD-MM-YYYY)
    searchOr.push(
      {
        $expr: {
          $regexMatch: {
            input: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: { $ifNull: ['$date', new Date(0)] },
              },
            },
            regex: escaped,
            options: 'i',
          },
        },
      },
      {
        $expr: {
          $regexMatch: {
            input: {
              $dateToString: {
                format: '%d-%m-%Y',
                date: { $ifNull: ['$date', new Date(0)] },
              },
            },
            regex: escaped,
            options: 'i',
          },
        },
      }
    );

    // Month name matching (e.g. "Nov", "November")
    const monthMatch = rawSearch.toLowerCase().match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i);
    if (monthMatch) {
      const mNum = MONTH_MAP[monthMatch[1].toLowerCase()];
      if (mNum) {
        searchOr.push({
          $expr: {
            $regexMatch: {
              input: {
                $dateToString: {
                  format: '%m',
                  date: { $ifNull: ['$date', new Date(0)] },
                },
              },
              regex: `^${mNum}$`,
            },
          },
        });
      }
    }

    andConditions.push({ $or: searchOr });
  }

  const finalFilter = andConditions.length === 1 ? andConditions[0] : { $and: andConditions };

  // Default sort by transaction date wise order, with creation order and _id as stable tie-breakers
  const sortOptions: Record<string, 1 | -1> = {};
  if (sortBy === 'date') {
    sortOptions.date = sortOrder;
    sortOptions.createdAt = -1;
    sortOptions._id = -1;
  } else {
    sortOptions[sortBy] = sortOrder;
    sortOptions.date = -1;
    sortOptions._id = -1;
  }

  const [data, total] = await Promise.all([
    Transaction.find(finalFilter)
      .populate('accountId', 'name icon color type')
      .populate('categoryId', 'name icon color')
      .populate('subCategoryId', 'name')
      .populate('tags', 'name color')
      .populate('fromAccountId', 'name icon color')
      .populate('toAccountId', 'name icon color')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit),
    Transaction.countDocuments(finalFilter),
  ]);

  return buildPaginatedResult(data, total, page, limit);
};

export const getTransactionById = async (userId: string, id: string) => {
  return Transaction.findOne({ _id: id, userId })
    .populate('accountId categoryId subCategoryId tags fromAccountId toAccountId');
};

export const updateTransaction = async (userId: string, id: string, data: any) => {
  const OPTIONAL_ID_FIELDS = ['categoryId', 'subCategoryId', 'accountId', 'fromAccountId', 'toAccountId'];
  const clean = { ...data };
  for (const field of OPTIONAL_ID_FIELDS) {
    if (clean[field] === '' || clean[field] === null) delete clean[field];
  }
  if (Array.isArray(clean.tags)) clean.tags = clean.tags.filter((t: string) => t !== '');

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const old = await Transaction.findOne({ _id: id, userId }).session(session);
    if (!old) throw new Error('Transaction not found');

    // 1. Reverse the OLD transaction's effect on balances
    if (old.type === 'income' && old.accountId) {
      await Account.findByIdAndUpdate(old.accountId, { $inc: { currentBalance: -old.amount } }, { session });
    } else if ((old.type === 'expense' || old.type === 'investment') && old.accountId) {
      await Account.findByIdAndUpdate(old.accountId, { $inc: { currentBalance: old.amount } }, { session });
    } else if (old.type === 'transfer') {
      if (old.fromAccountId) await Account.findByIdAndUpdate(old.fromAccountId, { $inc: { currentBalance: old.amount } }, { session });
      if (old.toAccountId) await Account.findByIdAndUpdate(old.toAccountId, { $inc: { currentBalance: -old.amount } }, { session });
    }

    // 2. Apply the updates (note: type cannot be changed via edit, only amount/details)
    Object.assign(old, clean);
    await old.save({ session });

    // 3. Re-apply the NEW (updated) transaction's effect on balances
    if (old.type === 'income' && old.accountId) {
      await Account.findByIdAndUpdate(old.accountId, { $inc: { currentBalance: old.amount } }, { session });
    } else if ((old.type === 'expense' || old.type === 'investment') && old.accountId) {
      await Account.findByIdAndUpdate(old.accountId, { $inc: { currentBalance: -old.amount } }, { session });
    } else if (old.type === 'transfer') {
      if (old.fromAccountId) await Account.findByIdAndUpdate(old.fromAccountId, { $inc: { currentBalance: -old.amount } }, { session });
      if (old.toAccountId) await Account.findByIdAndUpdate(old.toAccountId, { $inc: { currentBalance: old.amount } }, { session });
    }

    await session.commitTransaction();
    return Transaction.findById(id).populate('accountId categoryId subCategoryId tags fromAccountId toAccountId');
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
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
