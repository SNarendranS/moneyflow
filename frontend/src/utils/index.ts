import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';

export const cn = (...inputs: ClassValue[]) => clsx(inputs);

export const formatCurrency = (amount: number, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (date: string | Date) => {
  const d = new Date(date);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'dd MMM yyyy');
};

export const formatDateShort = (date: string | Date) => format(new Date(date), 'dd MMM');

export const formatDateTime = (date: string | Date) => format(new Date(date), 'dd MMM yyyy, hh:mm a');

export const formatRelative = (date: string | Date) => formatDistanceToNow(new Date(date), { addSuffix: true });

export const getTransactionColor = (type: string) => {
  switch (type) {
    case 'income': return 'text-emerald-400';
    case 'expense': return 'text-red-400';
    case 'transfer': return 'text-blue-400';
    case 'investment': return 'text-purple-400';
    default: return 'text-gray-400';
  }
};

export const getTransactionSign = (type: string) => {
  switch (type) {
    case 'income': return '+';
    case 'expense': return '-';
    case 'transfer': return '↕';
    case 'investment': return '→';
    default: return '';
  }
};

export const getTransactionBg = (type: string) => {
  switch (type) {
    case 'income': return 'bg-emerald-500/10 text-emerald-400';
    case 'expense': return 'bg-red-500/10 text-red-400';
    case 'transfer': return 'bg-blue-500/10 text-blue-400';
    case 'investment': return 'bg-purple-500/10 text-purple-400';
    default: return 'bg-gray-500/10 text-gray-400';
  }
};

export const calculateNextDue = (frequencyType: string, customDays?: number): Date => {
  const now = new Date();
  switch (frequencyType) {
    case 'daily': now.setDate(now.getDate() + 1); break;
    case 'weekly': now.setDate(now.getDate() + 7); break;
    case 'monthly': now.setMonth(now.getMonth() + 1); break;
    case 'yearly': now.setFullYear(now.getFullYear() + 1); break;
    case 'custom': now.setDate(now.getDate() + (customDays || 30)); break;
  }
  return now;
};

export const ACCOUNT_ICONS: Record<string, string> = {
  salary: '💰',
  savings: '🏦',
  cash: '💵',
  wallet: '👛',
  credit_card: '💳',
};

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  salary: 'Salary Account',
  savings: 'Savings Account',
  cash: 'Cash',
  wallet: 'Wallet',
  credit_card: 'Credit Card',
};
