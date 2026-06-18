import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import * as txService from '../services/transaction.service';
import { sendSuccess, sendError } from '../utils/response';

export const getTransactions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await txService.getTransactions(req.user!.id, req.query as any);
    sendSuccess(res, result);
  } catch (err) { next(err); }
};

export const createTransaction = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await txService.createTransaction(req.user!.id, req.body);
    const { transaction, goalWarning } = result as any;
    sendSuccess(res, { transaction, goalWarning }, goalWarning ? 'Transaction created with warning' : 'Transaction created', 201);
  } catch (err) { next(err); }
};

export const getTransaction = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tx = await txService.getTransactionById(req.user!.id, req.params.id);
    if (!tx) return sendError(res, 'Transaction not found', 404);
    sendSuccess(res, tx);
  } catch (err) { next(err); }
};

export const deleteTransaction = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await txService.deleteTransaction(req.user!.id, req.params.id);
    sendSuccess(res, null, 'Transaction deleted');
  } catch (err: any) {
    if (err.message === 'Transaction not found') return sendError(res, err.message, 404);
    next(err);
  }
};
