import { z } from 'zod';

export const createAccountSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['salary', 'savings', 'cash', 'wallet', 'credit_card']),
  openingBalance: z.number().default(0),
  color: z.string().optional().default('#6366f1'),
  icon: z.string().optional().default('wallet'),
});

export const updateAccountSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  isArchived: z.boolean().optional(),
});

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().optional().default('tag'),
  color: z.string().optional().default('#6366f1'),
});

export const createSubcategorySchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1).max(100),
});

export const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().optional().default('#6366f1'),
});

export const createGoalSchema = z.object({
  title: z.string().min(1).max(100),
  targetAmount: z.number().positive(),
  targetDate: z.string().or(z.date()),
  color: z.string().optional().default('#6366f1'),
  icon: z.string().optional().default('target'),
});

export const goalContributionSchema = z.object({
  amount: z.number().positive(),
  date: z.string().or(z.date()).optional(),
  notes: z.string().max(500).optional(),
});

export const createRecurringSchema = z.object({
  title: z.string().min(1).max(100),
  amount: z.number().positive(),
  transactionType: z.enum(['income', 'expense', 'transfer', 'investment']),
  frequencyType: z.enum(['daily', 'weekly', 'monthly', 'yearly', 'custom']),
  customDays: z.number().positive().optional(),
  nextDueDate: z.string().or(z.date()),
  accountId: z.string().min(1),
  categoryId: z.string().optional(),
  notes: z.string().max(500).optional(),
}).refine((data) => {
  if (data.frequencyType === 'custom') return !!data.customDays;
  return true;
}, { message: 'customDays required for custom frequency' });
