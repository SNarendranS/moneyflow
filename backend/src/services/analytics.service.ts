import Transaction from '../models/Transaction';
import Account from '../models/Account';
import { Goal } from '../models/Goal';
import mongoose from 'mongoose';

export const getDashboardData = async (userId: string) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const uid = new mongoose.Types.ObjectId(userId);

  const [monthStats, accounts, goals] = await Promise.all([
    Transaction.aggregate([
      { $match: { userId: uid, date: { $gte: startOfMonth, $lte: endOfMonth } } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]),
    Account.find({ userId, isArchived: false }).select('name type currentBalance color icon'),
    Goal.find({ userId, isCompleted: false }).sort({ targetDate: 1 }).limit(5),
  ]);

  const stats: Record<string, number> = { income: 0, expense: 0, transfer: 0, investment: 0 };
  for (const s of monthStats) {
    stats[s._id] = s.total;
  }

  const netWorth = accounts.reduce((sum: number, a: any) => {
    return a.type === 'credit_card' ? sum - a.currentBalance : sum + a.currentBalance;
  }, 0);

  const savingsRate = stats.income > 0
    ? Math.round(((stats.income - stats.expense) / stats.income) * 100)
    : 0;

  return { stats, accounts, goals, netWorth, savingsRate };
};

export const getMonthlyAnalytics = async (userId: string, months = 6) => {
  const uid = new mongoose.Types.ObjectId(userId);
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months + 1);
  startDate.setDate(1);

  const data = await Transaction.aggregate([
    { $match: { userId: uid, date: { $gte: startDate } } },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' },
          type: '$type',
        },
        total: { $sum: '$amount' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  return data;
};

export const getCategoryBreakdown = async (userId: string, startDate?: string, endDate?: string) => {
  const uid = new mongoose.Types.ObjectId(userId);
  const now = new Date();
  const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return Transaction.aggregate([
    {
      $match: {
        userId: uid,
        type: 'expense',
        categoryId: { $exists: true },
        date: { $gte: start, $lte: end },
      },
    },
    { $group: { _id: '$categoryId', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    {
      $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: '_id',
        as: 'category',
      },
    },
    { $unwind: '$category' },
    { $project: { total: 1, count: 1, 'category.name': 1, 'category.color': 1, 'category.icon': 1 } },
    { $sort: { total: -1 } },
  ]);
};

export const getSavingsTrend = async (userId: string, months = 6) => {
  const uid = new mongoose.Types.ObjectId(userId);
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months + 1);
  startDate.setDate(1);

  return Transaction.aggregate([
    { $match: { userId: uid, type: { $in: ['income', 'expense'] }, date: { $gte: startDate } } },
    {
      $group: {
        _id: { year: { $year: '$date' }, month: { $month: '$date' }, type: '$type' },
        total: { $sum: '$amount' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);
};

export const getFamilySupportStats = async (userId: string) => {
  const uid = new mongoose.Types.ObjectId(userId);
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  return Transaction.aggregate([
    {
      $match: {
        userId: uid,
        type: 'transfer',
        toExternal: { $exists: true, $ne: null },
        date: { $gte: startOfYear },
      },
    },
    {
      $group: {
        _id: '$toExternal',
        totalYearly: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { totalYearly: -1 } },
  ]);
};

export const generateInsights = async (userId: string): Promise<string[]> => {
  const uid = new mongoose.Types.ObjectId(userId);
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const insights: string[] = [];

  const [thisMonth, lastMonth] = await Promise.all([
    Transaction.aggregate([
      { $match: { userId: uid, date: { $gte: thisMonthStart } } },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: { userId: uid, date: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]),
  ]);

  const toMap = (arr: any[]) => arr.reduce((m: any, i: any) => { m[i._id] = i.total; return m; }, {});
  const tm = toMap(thisMonth);
  const lm = toMap(lastMonth);

  if (tm.expense && lm.expense) {
    const change = Math.round(((tm.expense - lm.expense) / lm.expense) * 100);
    if (Math.abs(change) >= 10) {
      insights.push(
        change > 0
          ? `Spending increased by ${change}% compared to last month`
          : `Spending decreased by ${Math.abs(change)}% compared to last month`
      );
    }
  }

  if (tm.income) {
    const savingsRate = Math.round(((tm.income - (tm.expense || 0)) / tm.income) * 100);
    insights.push(`You saved ${savingsRate}% of your income this month`);
  }

  const topCat = await Transaction.aggregate([
    { $match: { userId: uid, type: 'expense', date: { $gte: thisMonthStart }, categoryId: { $exists: true } } },
    { $group: { _id: '$categoryId', total: { $sum: '$amount' } } },
    { $sort: { total: -1 } },
    { $limit: 1 },
    { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'cat' } },
    { $unwind: '$cat' },
  ]);

  if (topCat.length > 0) {
    insights.push(`Your highest spending category is ${topCat[0].cat.name}`);
  }

  return insights;
};
