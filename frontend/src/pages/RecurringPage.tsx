import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recurringAPI, accountsAPI, categoriesAPI } from '../services/api';
import { formatCurrency, formatDate } from '../utils';
import { useAuth } from '../store/auth';
import { Plus, Trash2, RefreshCw, AlertCircle, Clock, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '../utils';

const schema = z.object({
  title: z.string().min(1, 'Title required'),
  amount: z.coerce.number().positive(),
  transactionType: z.enum(['income','expense','transfer','investment']),
  frequencyType: z.enum(['daily','weekly','monthly','yearly','custom']),
  customDays: z.coerce.number().optional(),
  nextDueDate: z.string().min(1),
  accountId: z.string().min(1, 'Account required'),
  categoryId: z.string().optional(),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const STATUS_CONFIG: Record<string, { label: string; classes: string; icon: any }> = {
  overdue: { label: 'Overdue', classes: 'bg-red-500/10 text-red-400 border-red-500/20', icon: AlertCircle },
  due_soon: { label: 'Due Soon', classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Clock },
  upcoming: { label: 'Upcoming', classes: 'bg-white/5 text-gray-400 border-white/10', icon: Calendar },
};

export default function RecurringPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const currency = user?.currency || 'INR';
  const [showAdd, setShowAdd] = useState(false);

  const { data: recurring = [], isLoading } = useQuery({
    queryKey: ['recurring'],
    queryFn: () => recurringAPI.list().then(r => r.data.data),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsAPI.list().then(r => r.data.data),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.list().then(r => r.data.data),
  });

  const create = useMutation({
    mutationFn: (d: FormData) => recurringAPI.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recurring'] }); toast.success('Recurring transaction created'); setShowAdd(false); reset(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const del = useMutation({
    mutationFn: (id: string) => recurringAPI.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recurring'] }); toast.success('Deleted'); },
  });

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { transactionType: 'expense', frequencyType: 'monthly', nextDueDate: new Date().toISOString().split('T')[0] },
  });

  const freqType = watch('frequencyType');
  const overdue = recurring.filter((r: any) => r.status === 'overdue');
  const dueSoon = recurring.filter((r: any) => r.status === 'due_soon');
  const upcoming = recurring.filter((r: any) => r.status === 'upcoming');

  const RecurringCard = ({ r }: { r: any }) => {
    const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.upcoming;
    const Icon = cfg.icon;
    return (
      <div className={cn('card p-4 border group', cfg.classes.split(' ').find(c => c.startsWith('border')) || 'border-white/10')}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', cfg.classes.split(' ').slice(0,2).join(' '))}>
              <Icon size={16}/>
            </div>
            <div>
              <div className="font-medium text-white">{r.title}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {r.frequencyType === 'custom' ? `Every ${r.customDays} days` : r.frequencyType}
                {' · '}{r.accountId?.name}
              </div>
            </div>
          </div>
          <button onClick={() => { if(confirm('Delete?')) del.mutate(r._id); }} className="opacity-0 group-hover:opacity-100 btn-ghost p-1.5 text-red-400">
            <Trash2 size={14}/>
          </button>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
          <span className={cn('badge border', cfg.classes)}><Icon size={11}/>{cfg.label}</span>
          <div className="text-right">
            <div className="font-mono font-semibold text-white">{formatCurrency(r.amount, currency)}</div>
            <div className="text-xs text-gray-500">Due {formatDate(r.nextDueDate)}</div>
          </div>
        </div>
      </div>
    );
  };

  const Section = ({ title, items, icon: Icon, color }: any) => items.length > 0 ? (
    <div>
      <h2 className={cn('section-title mb-3 flex items-center gap-2', color)}><Icon size={16}/>{title} ({items.length})</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((r: any) => <RecurringCard key={r._id} r={r}/>)}
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Recurring Transactions</h1>
          <p className="text-muted mt-0.5">{recurring.length} active schedules</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2"><Plus size={16}/> Add</button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"/></div>
      ) : (
        <div className="space-y-6">
          <Section title="Overdue" items={overdue} icon={AlertCircle} color="text-red-400"/>
          <Section title="Due Soon" items={dueSoon} icon={Clock} color="text-amber-400"/>
          <Section title="Upcoming" items={upcoming} icon={Calendar} color="text-white"/>
          {recurring.length === 0 && (
            <div className="text-center py-16 text-muted">
              <RefreshCw size={40} className="mx-auto mb-3 opacity-30"/>
              <p className="text-lg mb-1">No recurring transactions</p>
              <p className="text-sm">Add WiFi, SIP, rent — anything that repeats</p>
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAdd(false)}/>
          <div className="relative z-10 w-full max-w-md card p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-5">New Recurring Transaction</h2>
            <form onSubmit={handleSubmit(d => create.mutate(d))} className="space-y-4">
              <div>
                <label className="label">Title</label>
                <input {...register('title')} placeholder="e.g. WiFi Bill, SIP" className="input"/>
                {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Amount</label>
                  <input {...register('amount')} type="number" step="0.01" placeholder="0.00" className="input font-mono"/>
                  {errors.amount && <p className="text-xs text-red-400 mt-1">{errors.amount.message}</p>}
                </div>
                <div>
                  <label className="label">Type</label>
                  <select {...register('transactionType')} className="input">
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                    <option value="investment">Investment</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Frequency</label>
                  <select {...register('frequencyType')} className="input">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="custom">Custom (X days)</option>
                  </select>
                </div>
                {freqType === 'custom' && (
                  <div>
                    <label className="label">Every X days</label>
                    <input {...register('customDays')} type="number" placeholder="e.g. 84" className="input"/>
                  </div>
                )}
              </div>
              <div>
                <label className="label">Next Due Date</label>
                <input {...register('nextDueDate')} type="date" className="input"/>
              </div>
              <div>
                <label className="label">Account</label>
                <select {...register('accountId')} className="input">
                  <option value="">Select account</option>
                  {accounts.map((a: any) => <option key={a._id} value={a._id}>{a.name}</option>)}
                </select>
                {errors.accountId && <p className="text-xs text-red-400 mt-1">{errors.accountId.message}</p>}
              </div>
              <div>
                <label className="label">Category (optional)</label>
                <select {...register('categoryId')} className="input">
                  <option value="">None</option>
                  {categories.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Notes</label>
                <input {...register('notes')} placeholder="Optional note" className="input"/>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={create.isPending} className="btn-primary flex-1">{create.isPending ? 'Saving…' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
