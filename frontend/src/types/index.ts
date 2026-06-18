export interface User {
  _id: string;
  name: string;
  email: string;
  currency: string;
  timezone: string;
  createdAt: string;
}

export interface Account {
  _id: string;
  name: string;
  type: 'salary' | 'savings' | 'cash' | 'wallet' | 'credit_card';
  openingBalance: number;
  currentBalance: number;
  color: string;
  icon: string;
  isArchived: boolean;
}

export interface Category {
  _id: string;
  name: string;
  icon: string;
  color: string;
  subcategories?: Subcategory[];
}

export interface Subcategory {
  _id: string;
  categoryId: string;
  name: string;
}

export interface Tag {
  _id: string;
  name: string;
  color: string;
}

export type TransactionType = 'income' | 'expense' | 'transfer' | 'investment';

export interface Transaction {
  _id: string;
  type: TransactionType;
  amount: number;
  date: string;
  notes?: string;
  accountId?: Account;
  categoryId?: Category;
  subCategoryId?: Subcategory;
  tags?: Tag[];
  fromAccountId?: Account;
  toAccountId?: Account;
  toExternal?: string;
  investmentType?: string;
  investmentName?: string;
  incomeSource?: string;
  createdAt: string;
}

export interface RecurringTransaction {
  _id: string;
  title: string;
  amount: number;
  transactionType: TransactionType;
  frequencyType: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  customDays?: number;
  nextDueDate: string;
  accountId: Account;
  categoryId?: Category;
  notes?: string;
  isActive: boolean;
  status: 'overdue' | 'due_soon' | 'upcoming';
}

export interface Goal {
  _id: string;
  title: string;
  targetAmount: number;
  savedAmount: number;
  targetDate: string;
  color: string;
  icon: string;
  isCompleted: boolean;
}

export interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface DashboardStats {
  stats: Record<string, number>;
  accounts: Account[];
  goals: Goal[];
  netWorth: number;
  savingsRate: number;
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

export interface AuthTokens {
  user: User;
  accessToken: string;
  refreshToken: string;
}
