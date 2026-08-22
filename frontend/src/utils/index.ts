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
    case 'expense': return 'text-rose-400';
    case 'transfer': return 'text-sky-400';
    case 'investment': return 'text-violet-400';
    default: return 'text-slate-400';
  }
};

export const getTransactionSign = (type: string) => {
  switch (type) {
    case 'income': return '+';
    case 'expense': return '-';
    case 'transfer': return '';
    case 'investment': return '• ';
    default: return '';
  }
};

export const getTransactionBg = (type: string) => {
  switch (type) {
    case 'income': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'expense': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    case 'transfer': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    case 'investment': return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
    default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
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

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  salary: 'Salary Account',
  savings: 'Savings Account',
  cash: 'Cash / Currency',
  wallet: 'Digital Wallet',
  credit_card: 'Credit Card',
};
