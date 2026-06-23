import { z } from 'zod';

// Strips keys whose value is an empty string "" so optional fields
// (accountId, categoryId, investmentType, etc.) don't fail enum/ObjectId validation
// when the frontend sends "" instead of omitting the field.
const stripEmptyStrings = (data: any) => {
  if (typeof data !== 'object' || data === null) return data;
  const clean: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === '') continue;
    if (Array.isArray(value)) {
      clean[key] = value.filter((v) => v !== '');
      continue;
    }
    clean[key] = value;
  }
  return clean;
};

export const createTransactionSchema = z.preprocess(
  stripEmptyStrings,
  z.object({
    type: z.enum(['income', 'expense', 'transfer', 'investment']),
    amount: z.number().positive(),
    date: z.string().or(z.date()),
    notes: z.string().max(500).optional(),
    accountId: z.string().optional(),
    categoryId: z.string().optional(),
    subCategoryId: z.string().optional(),
    tags: z.array(z.string()).optional(),
    fromAccountId: z.string().optional(),
    toAccountId: z.string().optional(),
    toExternal: z.string().max(100).optional(),
    investmentType: z.enum(['sip', 'mutual_fund', 'stock', 'fd', 'other']).optional(),
    investmentName: z.string().max(100).optional(),
    incomeSource: z.string().max(100).optional(),
  }).refine((data) => {
    if (data.type === 'transfer') {
      return data.fromAccountId && (data.toAccountId || data.toExternal);
    }
    return !!data.accountId;
  }, { message: 'Transfer requires fromAccountId and toAccountId/toExternal; others require accountId' })
);

export const updateTransactionSchema = z.preprocess(
  stripEmptyStrings,
  z.object({
    amount: z.number().positive().optional(),
    date: z.string().or(z.date()).optional(),
    notes: z.string().max(500).optional(),
    accountId: z.string().optional(),
    categoryId: z.string().optional(),
    subCategoryId: z.string().optional(),
    tags: z.array(z.string()).optional(),
    fromAccountId: z.string().optional(),
    toAccountId: z.string().optional(),
    investmentType: z.enum(['sip', 'mutual_fund', 'stock', 'fd', 'other']).optional(),
    investmentName: z.string().max(100).optional(),
    incomeSource: z.string().max(100).optional(),
    toExternal: z.string().max(100).optional(),
  })
);
