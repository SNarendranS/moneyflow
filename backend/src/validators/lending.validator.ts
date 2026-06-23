import { z } from 'zod';

const stripEmptyStrings = (data: any) => {
  if (typeof data !== 'object' || data === null) return data;
  const clean: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === '') continue;
    clean[key] = value;
  }
  return clean;
};

export const createLendingSchema = z.preprocess(
  stripEmptyStrings,
  z.object({
    direction: z.enum(['lent', 'borrowed']),
    personName: z.string().min(1, 'Person name is required').max(100),
    amount: z.number().positive(),
    accountId: z.string().min(1, 'Account is required'),
    date: z.string().or(z.date()),
    expectedReturnDate: z.string().or(z.date()).optional(),
    notes: z.string().max(500).optional(),
  })
);

export const updateLendingSchema = z.preprocess(
  stripEmptyStrings,
  z.object({
    personName: z.string().min(1).max(100).optional(),
    amount: z.number().positive().optional(),
    expectedReturnDate: z.string().or(z.date()).optional(),
    notes: z.string().max(500).optional(),
  })
);

export const settleLendingSchema = z.preprocess(
  stripEmptyStrings,
  z.object({
    amount: z.number().positive(), // amount being settled now (supports partial settlement)
    accountId: z.string().min(1, 'Account is required'), // which account receives/pays the settlement
    date: z.string().or(z.date()).optional(),
    notes: z.string().max(500).optional(),
  })
);
