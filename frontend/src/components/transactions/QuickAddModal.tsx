import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, TrendingUp, TrendingDown, ArrowLeftRight, PiggyBank, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsAPI, accountsAPI, categoriesAPI, tagsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { cn } from '../../utils';

const schema = z.object({
  type: z.enum(['income', 'expense', 'transfer', 'investment']),
  amount: z.coerce.number().positive('Amount must be positive'),
  date: z.string().min(1, 'Date required'),
  notes: z.string().optional(),
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  subCategoryId: z.string().optional(),
  fromAccountId: z.string().optional(),
  toAccountId: z.string().optional(),
  toExternal: z.string().optional(),
  investmentType: z.string().optional(),
  investmentName: z.string().optional(),
  incomeSource: z.string().optional(),
  tags: z.array(z.string()).optional(),
});
type FormData = z.infer<typeof schema>;

const TYPES = [
  { value: 'expense', label: 'Expense', icon: TrendingDown, activeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-glow-red' },
  { value: 'income', label: 'Income', icon: TrendingUp, activeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-glow-emerald' },
  { value: 'transfer', label: 'Transfer', icon: ArrowLeftRight, activeClass: 'bg-sky-500/20 text-sky-400 border-sky-500/40' },
  { value: 'investment', label: 'Investment', icon: PiggyBank, activeClass: 'bg-violet-500/20 text-violet-400 border-violet-500/40' },
];

interface QuickAddModalProps {
  onClose: () => void;
  editTransaction?: any;
}

export default function QuickAddModal({ onClose, editTransaction }: QuickAddModalProps) {
  const qc = useQueryClient();
  const isEdit = !!editTransaction;
  const [selectedTags, setSelectedTags] = useState<string[]>(
    editTransaction?.tags?.map((t: any) => t._id || t) || []
  );
  const [isExternal, setIsExternal] = useState(!!editTransaction?.toExternal);

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsAPI.list().then(r => r.data.data)
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.list().then(r => r.data.data)
  });

  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsAPI.list().then(r => r.data.data)
  });

  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: editTransaction ? {
      type: editTransaction.type,
      amount: editTransaction.amount,
      date: editTransaction.date?.split('T')[0],
      notes: editTransaction.notes || '',
      accountId: editTransaction.accountId?._id || editTransaction.accountId || '',
      categoryId: editTransaction.categoryId?._id || editTransaction.categoryId || '',
      subCategoryId: editTransaction.subCategoryId?._id || editTransaction.subCategoryId || '',
      fromAccountId: editTransaction.fromAccountId?._id || editTransaction.fromAccountId || '',
      toAccountId: editTransaction.toAccountId?._id || editTransaction.toAccountId || '',
      toExternal: editTransaction.toExternal || '',
      investmentType: editTransaction.investmentType || '',
      investmentName: editTransaction.investmentName || '',
      incomeSource: editTransaction.incomeSource || '',
    } : {
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
    },
  });

  useEffect(() => {
    if (editTransaction) {
      reset({
        type: editTransaction.type,
        amount: editTransaction.amount,
        date: editTransaction.date?.split('T')[0],
        notes: editTransaction.notes || '',
        accountId: editTransaction.accountId?._id || editTransaction.accountId || '',
        categoryId: editTransaction.categoryId?._id || editTransaction.categoryId || '',
        subCategoryId: editTransaction.subCategoryId?._id || editTransaction.subCategoryId || '',
        fromAccountId: editTransaction.fromAccountId?._id || editTransaction.fromAccountId || '',
        toAccountId: editTransaction.toAccountId?._id || editTransaction.toAccountId || '',
        toExternal: editTransaction.toExternal || '',
        investmentType: editTransaction.investmentType || '',
        investmentName: editTransaction.investmentName || '',
        incomeSource: editTransaction.incomeSource || '',
      });
      setSelectedTags(editTransaction.tags?.map((t: any) => t._id || t) || []);
      setIsExternal(!!editTransaction.toExternal);
    }
  }, [editTransaction?._id, accounts, categories]);

  const type = watch('type');
  const categoryId = watch('categoryId');
  const selectedCategory = categories?.find((c: any) => c._id === categoryId);
  const filteredCategories = categories?.filter((c: any) => {
    if (type === 'income') return c.type === 'income';
    if (type === 'investment') return c.type === 'investment';
    return (c.type || 'expense') === 'expense';
  });

  const mutation = useMutation({
    mutationFn: (data: any) =>
      isEdit ? transactionsAPI.update(editTransaction._id, data) : transactionsAPI.create(data),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      const goalWarning = res?.data?.data?.goalWarning;
      if (goalWarning) {
        toast(goalWarning, {
          duration: 8000,
          style: {
            background: '#1a0c0a',
            color: '#fda4af',
            border: '1px solid #e11d48',
            borderRadius: '12px',
            maxWidth: '440px',
            fontSize: '13px'
          }
        });
      } else {
        toast.success(isEdit ? 'Transaction updated' : 'Transaction added');
      }
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || `Failed to ${isEdit ? 'update' : 'add'} transaction`),
  });

  const onSubmit = (data: FormData) => {
    const payload: any = { ...data, tags: selectedTags };
    for (const key of Object.keys(payload)) {
      if (payload[key] === '') delete payload[key];
    }
    mutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-[#121422] border border-white/10 rounded-2xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/80 ring-1 ring-white/5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white tracking-tight">{isEdit ? 'Edit Transaction' : 'Record Transaction'}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5 text-slate-400 hover:text-white"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Type Selector */}
          <div className="grid grid-cols-4 gap-1.5">
            {TYPES.map(t => {
              const Icon = t.icon;
              const isSelected = type === t.value;
              return (
                <label
                  key={t.value}
                  className={cn(
                    'flex flex-col items-center justify-center py-2.5 rounded-xl border text-xs font-semibold transition-all gap-1',
                    isSelected ? t.activeClass : 'border-white/[0.08] text-slate-400 bg-white/[0.02] hover:bg-white/[0.05] hover:text-white',
                    isEdit ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                  )}
                >
                  <input {...register('type')} type="radio" value={t.value} className="sr-only" disabled={isEdit} />
                  <Icon size={14} />
                  <span>{t.label}</span>
                </label>
              );
            })}
          </div>

          {/* Amount */}
          <div>
            <label className="label">Amount</label>
            <input {...register('amount')} type="number" step="0.01" placeholder="0.00" className="input font-mono text-lg font-bold" />
            {errors.amount && <p className="text-xs text-rose-400 mt-1">{errors.amount.message}</p>}
          </div>

          {/* Date */}
          <div>
            <label className="label">Date</label>
            <input {...register('date')} type="date" className="input" />
          </div>

          {/* Account */}
          {type !== 'transfer' && (
            <div>
              <label className="label">Account</label>
              <select {...register('accountId')} className="input">
                <option value="">Select account</option>
                {accounts?.map((a: any) => <option key={a._id} value={a._id}>{a.name}</option>)}
              </select>
            </div>
          )}

          {/* Categories */}
          {type === 'expense' && (
            <>
              <div>
                <label className="label">Category</label>
                <select {...register('categoryId')} className="input">
                  <option value="">Select expense category</option>
                  {filteredCategories?.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              {selectedCategory?.subcategories?.length > 0 && (
                <div>
                  <label className="label">Subcategory</label>
                  <select {...register('subCategoryId')} className="input">
                    <option value="">Select subcategory</option>
                    {selectedCategory.subcategories.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>
              )}
            </>
          )}

          {type === 'income' && (
            <>
              <div>
                <label className="label">Income Category</label>
                <select {...register('categoryId')} className="input">
                  <option value="">Select income category</option>
                  {filteredCategories?.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              {selectedCategory?.subcategories?.length > 0 && (
                <div>
                  <label className="label">Subcategory</label>
                  <select {...register('subCategoryId')} className="input">
                    <option value="">Select subcategory</option>
                    {selectedCategory.subcategories.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="label">Source / Payer note (optional)</label>
                <input {...register('incomeSource')} placeholder="e.g. Salary, Dividend, Freelance" className="input" />
              </div>
            </>
          )}

          {type === 'investment' && (
            <>
              <div>
                <label className="label">Investment Category</label>
                <select {...register('categoryId')} className="input">
                  <option value="">Select investment category</option>
                  {filteredCategories?.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              {selectedCategory?.subcategories?.length > 0 && (
                <div>
                  <label className="label">Subcategory</label>
                  <select {...register('subCategoryId')} className="input">
                    <option value="">Select subcategory</option>
                    {selectedCategory.subcategories.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="label">Instrument Name (optional)</label>
                <input {...register('investmentName')} placeholder="e.g. Nifty 50 Index, Apple Inc, S&P 500" className="input" />
              </div>
              <div>
                <label className="label">Asset Class</label>
                <select {...register('investmentType')} className="input">
                  <option value="">Select asset class</option>
                  {['sip', 'mutual_fund', 'stock', 'fd', 'other'].map(t => (
                    <option key={t} value={t}>{t.replace('_', ' ').toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {type === 'transfer' && (
            <>
              <div>
                <label className="label">From Account</label>
                <select {...register('fromAccountId')} className="input">
                  <option value="">Select source account</option>
                  {accounts?.map((a: any) => <option key={a._id} value={a._id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label mb-0">Destination</label>
                  <button type="button" onClick={() => setIsExternal(!isExternal)} className="text-xs text-brand-400 hover:text-brand-300 font-medium">
                    {isExternal ? 'Internal account' : 'External party'}
                  </button>
                </div>
                {isExternal ? (
                  <input {...register('toExternal')} placeholder="e.g. Landlord, Family Member" className="input" />
                ) : (
                  <select {...register('toAccountId')} className="input">
                    <option value="">Select destination account</option>
                    {accounts?.map((a: any) => <option key={a._id} value={a._id}>{a.name}</option>)}
                  </select>
                )}
              </div>
            </>
          )}

          {/* Notes */}
          <div>
            <label className="label">Notes / Description (optional)</label>
            <input {...register('notes')} placeholder="Add remarks or memo…" className="input" />
          </div>

          {/* Tags */}
          {tags?.length > 0 && (
            <div>
              <label className="label">Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag: any) => (
                  <button
                    key={tag._id}
                    type="button"
                    onClick={() => setSelectedTags(prev =>
                      prev.includes(tag._id) ? prev.filter(t => t !== tag._id) : [...prev, tag._id]
                    )}
                    className={cn(
                      'badge transition-all',
                      selectedTags.includes(tag._id)
                        ? 'bg-brand-500/20 text-brand-300 border-brand-500/40 shadow-glow'
                        : 'bg-white/[0.04] text-slate-400 border-white/[0.08] hover:text-white hover:bg-white/[0.08]'
                    )}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? 'Processing…' : isEdit ? 'Save Changes' : 'Record Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
