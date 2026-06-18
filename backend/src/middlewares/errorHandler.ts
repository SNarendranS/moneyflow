import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { sendError } from '../utils/response';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('❌ Error:', err.message);

  if (err instanceof ZodError) {
    sendError(res, 'Validation error', 400, err.errors);
    return;
  }

  if (err.name === 'CastError') {
    sendError(res, 'Invalid ID format', 400);
    return;
  }

  if (err.name === 'MongoServerError' && (err as any).code === 11000) {
    sendError(res, 'Duplicate entry', 409);
    return;
  }

  sendError(res, err.message || 'Internal Server Error', 500);
};

export const notFound = (_req: Request, res: Response): void => {
  sendError(res, 'Route not found', 404);
};
