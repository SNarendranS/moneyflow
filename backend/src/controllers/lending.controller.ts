import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import * as lendingService from '../services/lending.service';
import { sendSuccess, sendError } from '../utils/response';

export const getLendings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, direction } = req.query as { status?: string; direction?: string };
    const lendings = await lendingService.getLendings(req.user!.id, { status, direction });
    sendSuccess(res, lendings);
  } catch (err) { next(err); }
};

export const getLendingSummary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const summary = await lendingService.getLendingSummary(req.user!.id);
    sendSuccess(res, summary);
  } catch (err) { next(err); }
};

export const createLending = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const lending = await lendingService.createLending(req.user!.id, req.body);
    sendSuccess(res, lending, 'Lending entry created', 201);
  } catch (err) { next(err); }
};

export const updateLending = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const lending = await lendingService.updateLending(req.user!.id, req.params.id, req.body);
    sendSuccess(res, lending, 'Lending entry updated');
  } catch (err: any) {
    if (err.message === 'Lending entry not found') return sendError(res, err.message, 404);
    next(err);
  }
};

export const settleLending = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const lending = await lendingService.settleLending(req.user!.id, req.params.id, req.body);
    sendSuccess(res, lending, 'Settlement recorded');
  } catch (err: any) {
    if (err.message === 'Lending entry not found') return sendError(res, err.message, 404);
    if (err.message?.includes('exceeds remaining balance')) return sendError(res, err.message, 400);
    next(err);
  }
};

export const deleteLending = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await lendingService.deleteLending(req.user!.id, req.params.id);
    sendSuccess(res, null, 'Lending entry deleted');
  } catch (err: any) {
    if (err.message === 'Lending entry not found') return sendError(res, err.message, 404);
    next(err);
  }
};
