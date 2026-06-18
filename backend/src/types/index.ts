import { Request } from 'express';
import { Types } from 'mongoose';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export type TransactionType = 'income' | 'expense' | 'transfer' | 'investment';
export type AccountType = 'salary' | 'savings' | 'cash' | 'wallet' | 'credit_card';
export type FrequencyType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
export type InvestmentType = 'sip' | 'mutual_fund' | 'stock' | 'fd' | 'other';
export type NotificationType = 'bill_due' | 'recharge_due' | 'sip_due' | 'goal_milestone';

export interface PaginationQuery {
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  startDate?: string;
  endDate?: string;
  type?: string;
  accountId?: string;
  categoryId?: string;
  tagId?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
