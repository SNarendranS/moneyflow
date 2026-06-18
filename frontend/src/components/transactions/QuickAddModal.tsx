import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsAPI, accountsAPI, categoriesAPI, tagsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { cn } from '../../utils';

const schema = z.object({
  type: z.enum(['income', 'expense', 'transfer', 'investment']),
  amount: z.coerce.number().positive('Amount must be positive'),
  date: z.string().min(1),
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
  { value: 'expense', label: 'Expense', color: 'text-red-400 border-red-500/40 bg-red-500/10' },
  { value: 'income', label: 'Income', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' },
  { value: 'transfer', label: 'Transfer', color: 'text-blue-400 border-blue-500/40 bg-blue-500/10' },
  { value: 'investment', label: 'Investment', color: 'text-purple-400 border-purple-500/40 bg-purple-500/10' },
];

export default function QuickAddModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isExternal, setIsExternal] = useState(false);

  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: () => accountsAPI.list().then(r => r.data.data) });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesAPI.list().then(r => r.data.data) });
  const { data: tags } = useQuery({ queryKey: ['tags'], queryFn: () => tagsAPI.list().then(r => r.data.data) });

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
    },
  });

  const type = watch('type');
  const categoryId = watch('categoryId');
  const selectedCategory = categories?.find((c: any) => c._id === categoryId);

  const mutation = useMutation({
    mutationFn: (data: any) => transactionsAPI.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Transaction added!');
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to add transaction'),
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate({ ...data, tags: selectedTags });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md card p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Add Transaction</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Type Selector */}
          <div className="grid grid-cols-4 gap-1.5">
            {TYPES.map(t => (
              <label key={t.value} className={cn(
                'flex items-center justify-center py-2 rounded-xl border text-xs font-medium cursor-pointer transition-all',
                type === t.value ? t.color : 'border-white/10 text-gray-500 hover:border-white/20'
              )}>
                <input {...register('type')} type="radio" value={t.value} className="sr-only" />
                {t.label}
              </label>
            ))}
          </div>

          {/* Amount */}
          <div>
            <label className="label">Amount</label>
            <input {...register('amount')} type="number" step="0.01" placeholder="0.00" className="input font-mono text-lg" />
            {errors.amount && <p className="text-xs text-red-400 mt-1">{errors.amount.message}</p>}
          </div>

          {/* Date */}
          <div>
            <label className="label">Date</label>
            <input {...register('date')} type="date" className="input" />
          </div>

          {/* Type-specific fields */}
          {type !== 'transfer' && (
            <div>
              <label className="label">Account</label>
              <select {...register('accountId')} className="input">
                <option value="">Select account</option>
                {accounts?.map((a: any) => <option key={a._id} value={a._id}>{a.name}</option>)}
              </select>
            </div>
          )}

          {type === 'expense' && (
            <>
              <div>
                <label className="label">Category</label>
                <select {...register('categoryId')} className="input">
                  <option value="">Select category</option>
                  {categories?.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
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
            <div>
              <label className="label">Source</label>
              <input {...register('incomeSource')} placeholder="e.g. Salary, Freelance" className="input" />
            </div>
          )}

          {type === 'investment' && (
            <>
              <div>
                <label className="label">Investment Type</label>
                <select {...register('investmentType')} className="input">
                  <option value="">Select type</option>
                  {['sip', 'mutual_fund', 'stock', 'fd', 'other'].map(t => (
                    <option key={t} value={t}>{t.replace('_', ' ').toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Investment Name</label>
                <input {...register('investmentName')} placeholder="e.g. Nifty 50 SIP" className="input" />
              </div>
            </>
          )}

          {type === 'transfer' && (
            <>
              <div>
                <label className="label">From Account</label>
                <select {...register('fromAccountId')} className="input">
                  <option value="">Select account</option>
                  {accounts?.map((a: any) => <option key={a._id} value={a._id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label mb-0">To</label>
                  <button type="button" onClick={() => setIsExternal(!isExternal)} className="text-xs text-brand-400">
                    {isExternal ? 'Internal account' : 'External (person)'}
                  </button>
                </div>
                {isExternal ? (
                  <input {...register('toExternal')} placeholder="e.g. Mother, Friend" className="input" />
                ) : (
                  <select {...register('toAccountId')} className="input">
                    <option value="">Select account</option>
                    {accounts?.map((a: any) => <option key={a._id} value={a._id}>{a.name}</option>)}
                  </select>
                )}
              </div>
            </>
          )}

          {/* Notes */}
          <div>
            <label className="label">Notes (optional)</label>
            <input {...register('notes')} placeholder="Add a note…" className="input" />
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
                        ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40'
                        : 'bg-white/5 text-gray-400 border border-white/10 hover:border-white/20'
                    )}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting || mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? 'Saving…' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
