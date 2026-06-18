import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import Account from '../models/Account';
import { sendSuccess, sendError } from '../utils/response';

export const getAccounts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const accounts = await Account.find({ userId: req.user!.id, isArchived: false }).sort({ createdAt: 1 });
    sendSuccess(res, accounts);
  } catch (err) { next(err); }
};

export const createAccount = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const account = await Account.create({
      ...req.body,
      userId: req.user!.id,
      currentBalance: req.body.openingBalance || 0,
    });
    sendSuccess(res, account, 'Account created', 201);
  } catch (err) { next(err); }
};

export const updateAccount = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const account = await Account.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!account) return sendError(res, 'Account not found', 404);
    sendSuccess(res, account, 'Account updated');
  } catch (err) { next(err); }
};

export const archiveAccount = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const account = await Account.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.id },
      { isArchived: true },
      { new: true }
    );
    if (!account) return sendError(res, 'Account not found', 404);
    sendSuccess(res, account, 'Account archived');
  } catch (err) { next(err); }
};

export const getAccountHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const Transaction = (await import('../models/Transaction')).default;
    const { page = '1', limit = '20' } = req.query as any;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const accountId = req.params.id;

    const filter = {
      userId: req.user!.id,
      $or: [{ accountId }, { fromAccountId: accountId }, { toAccountId: accountId }],
    };

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate('categoryId', 'name icon color')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Transaction.countDocuments(filter),
    ]);

    sendSuccess(res, { transactions, total });
  } catch (err) { next(err); }
};
