import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recurringAPI, recurringActionAPI, accountsAPI, categoriesAPI } from '../services/api';
import { formatCurrency, formatDate } from '../utils';
import { useAuth } from '../store/auth';
import {
  Plus, Trash2, RefreshCw, AlertCircle, Clock, Calendar,
  CheckCircle2, BellOff, Pencil, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '../utils';

const schema = z.object({
  title: z.string().min(1, 'Title required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  transactionType: z.enum(['income', 'expense', 'transfer', 'investment']),
  frequencyType: z.enum(['daily', 'weekly', 'monthly', 'yearly', 'custom']),
  customDays: z.coerce.number().optional(),
  nextDueDate: z.string().min(1, 'Due date required'),
  accountId: z.string().min(1, 'Account required'),
  categoryId: z.string().optional(),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const SNOOZE_OPTIONS = [
  { label: '1 day', days: 1 },
  { label: '3 days', days: 3 },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
];

const STATUS_CONFIG: Record<string, { label: string; cardClass: string; badgeClass: string; icon: any }> = {
  overdue:  { label: 'Overdue',  cardClass: 'border-rose-500/30 bg-rose-500/5',  badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20',  icon: AlertCircle },
  due_soon: { label: 'Due Soon', cardClass: 'border-amber-500/30 bg-amber-500/5', badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Clock },
  upcoming: { label: 'Upcoming', cardClass: 'border-white/[0.08]',                 badgeClass: 'bg-white/5 text-slate-400 border-white/10',        icon: Calendar },
};

export default function RecurringPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const currency = user?.currency || 'INR';
  const [showAdd, setShowAdd] = useState(false);
  const [actionModal, setActionModal] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring'] });
      toast.success('Recurring transaction created');
      setShowAdd(false);
      reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to create'),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => recurringAPI.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring'] });
      toast.success('Recurring transaction updated');
      setEditItem(null);
      editReset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update'),
  });

  const del = useMutation({
    mutationFn: (id: string) => recurringAPI.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring'] });
      toast.success('Recurring transaction deleted');
    },
  });

  const markDone = useMutation({
    mutationFn: (id: string) => recurringActionAPI.markDone(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Marked as done and transaction recorded');
      setActionModal(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to complete'),
  });

  const snooze = useMutation({
    mutationFn: ({ id, days }: { id: string; days: number }) => recurringActionAPI.snooze(id, days),
    onSuccess: (_, { days }) => {
      qc.invalidateQueries({ queryKey: ['recurring'] });
      toast.success(`Snoozed for ${days} day(s)`);
      setActionModal(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to snooze'),
  });

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { transactionType: 'expense', frequencyType: 'monthly', nextDueDate: new Date().toISOString().split('T')[0] },
  });

  const { register: editReg, handleSubmit: editSubmit, watch: editWatch, reset: editReset, formState: { errors: editErrors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (editItem) {
      editReset({
        title: editItem.title,
        amount: editItem.amount,
        transactionType: editItem.transactionType,
        frequencyType: editItem.frequencyType,
        customDays: editItem.customDays,
        nextDueDate: editItem.nextDueDate?.split('T')[0],
        accountId: editItem.accountId?._id || editItem.accountId,
        categoryId: editItem.categoryId?._id || editItem.categoryId || '',
        notes: editItem.notes || '',
      });
    }
  }, [editItem]);

  const editFreqType = editWatch('frequencyType');
  const freqType = watch('frequencyType');
  const overdue  = recurring.filter((r: any) => r.status === 'overdue');
  const dueSoon  = recurring.filter((r: any) => r.status === 'due_soon');
  const upcoming = recurring.filter((r: any) => r.status === 'upcoming');

  const RecurringCard = ({ r }: { r: any }) => {
    const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.upcoming;
    const Icon = cfg.icon;
    const isActionable = r.status === 'overdue' || r.status === 'due_soon';

    return (
      <div className={cn('card p-4 border group hover:border-white/[0.14] transition-all', cfg.cardClass)}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center border', cfg.badgeClass)}>
              <Icon size={16} />
            </div>
            <div>
              <div className="font-semibold text-white tracking-tight">{r.title}</div>
              <div className="text-xs text-slate-500 mt-0.5 capitalize">
                {r.frequencyType === 'custom' ? `Every ${r.customDays} days` : r.frequencyType}
                {r.accountId?.name && ` · ${r.accountId.name}`}
              </div>
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => setEditItem(r)} className="btn-ghost p-1.5 text-blue-400 hover:text-blue-300" title="Edit">
              <Pencil size={14} />
            </button>
            <button onClick={() => { if (confirm(`Delete recurring schedule "${r.title}"?`)) del.mutate(r._id); }} className="btn-ghost p-1.5 text-rose-400 hover:text-rose-300" title="Delete">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.06]">
          <div>
            <div className="font-mono font-bold text-white text-base">{formatCurrency(r.amount, currency)}</div>
            <div className="text-[11px] text-slate-400">Due {formatDate(r.nextDueDate)}</div>
          </div>
          {isActionable ? (
            <button
              onClick={() => setActionModal(r)}
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm"
            >
              <CheckCircle2 size={14} />
              <span>Action</span>
            </button>
          ) : (
            <span className={cn('badge', cfg.badgeClass)}>
              <Icon size={12} />
              <span>{cfg.label}</span>
            </span>
          )}
        </div>
      </div>
    );
  };

  const Section = ({ title, items, icon: Icon, color }: any) => items.length > 0 ? (
    <div>
      <h2 className={cn('section-title mb-3 flex items-center gap-2', color)}>
        <Icon size={16} />
        <span>{title} ({items.length})</span>
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((r: any) => <RecurringCard key={r._id} r={r} />)}
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Recurring Transactions</h1>
          <p className="text-slate-400 text-sm mt-0.5">{recurring.length} active recurring schedules</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          <span>New Schedule</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16 text-slate-500">Loading recurring schedules…</div>
      ) : (
        <div className="space-y-8">
          <Section title="Overdue Items" items={overdue} icon={AlertCircle} color="text-rose-400" />
          <Section title="Due Soon" items={dueSoon} icon={Clock} color="text-amber-400" />
          <Section title="Upcoming Cycles" items={upcoming} icon={Calendar} color="text-white" />

          {recurring.length === 0 && (
            <div className="text-center py-16 card">
              <RefreshCw size={36} className="mx-auto mb-3 text-slate-600" />
              <p className="text-slate-300 font-medium mb-1">No recurring schedules yet</p>
              <p className="text-xs text-slate-500 mb-4">Track recurring bills, subscriptions, SIPs, and salaries</p>
              <button onClick={() => setShowAdd(true)} className="btn-primary text-xs inline-flex items-center gap-1.5">
                <Plus size={14} /> Add Schedule
              </button>
            </div>
          )}
        </div>
      )}

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setActionModal(null)} />
          <div className="relative z-10 w-full max-w-sm bg-[#121422] border border-white/10 rounded-2xl p-6 shadow-2xl shadow-black/80 ring-1 ring-white/5 animate-slide-up">
            <h2 className="text-lg font-semibold text-white mb-1">{actionModal.title}</h2>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-5">
              <span className={cn('badge py-0.5', actionModal.status === 'overdue' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20')}>
                {actionModal.status === 'overdue' ? 'Overdue' : 'Due Soon'}
              </span>
              <span>Due: {formatDate(actionModal.nextDueDate)}</span>
              <span>·</span>
              <span className="font-mono text-white font-bold">{formatCurrency(actionModal.amount, currency)}</span>
            </div>

            {/* Mark Done */}
            <div className="mb-4">
              <p className="text-xs text-slate-400 mb-2">Has this payment or credit been completed?</p>
              <button
                onClick={() => markDone.mutate(actionModal._id)}
                disabled={markDone.isPending}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-semibold py-2.5 rounded-xl transition-all"
              >
                <CheckCircle2 size={16} />
                <span>{markDone.isPending ? 'Recording…' : 'Confirm & Mark Done'}</span>
              </button>
              <p className="text-[11px] text-slate-500 mt-1.5 text-center">Records a transaction and adjusts balance for {actionModal.accountId?.name}</p>
            </div>

            {/* Snooze */}
            <div>
              <p className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
                <BellOff size={13} />
                <span>Snooze reminder</span>
              </p>
              <div className="grid grid-cols-4 gap-2">
                {SNOOZE_OPTIONS.map(opt => (
                  <button
                    key={opt.days}
                    onClick={() => snooze.mutate({ id: actionModal._id, days: opt.days })}
                    disabled={snooze.isPending}
                    className="py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-slate-300 hover:text-white transition-colors text-center"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => setActionModal(null)} className="w-full btn-secondary mt-5 text-xs py-2">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative z-10 w-full max-w-md bg-[#121422] border border-white/10 rounded-2xl p-6 shadow-2xl shadow-black/80 ring-1 ring-white/5 animate-slide-up max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-4">New Recurring Schedule</h2>
            <form onSubmit={handleSubmit(d => create.mutate(d))} className="space-y-4">
              <div>
                <label className="label">Title</label>
                <input {...register('title')} placeholder="e.g. WiFi Bill, Netflix, SIP, Rent" className="input" />
                {errors.title && <p className="text-xs text-rose-400 mt-1">{errors.title.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Amount</label>
                  <input {...register('amount')} type="number" step="0.01" placeholder="0.00" className="input font-mono" />
                  {errors.amount && <p className="text-xs text-rose-400 mt-1">{errors.amount.message}</p>}
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
                    <label className="label">Every X Days</label>
                    <input {...register('customDays')} type="number" placeholder="e.g. 84" className="input" />
                  </div>
                )}
              </div>
              <div>
                <label className="label">Next Due Date</label>
                <input {...register('nextDueDate')} type="date" className="input" />
              </div>
              <div>
                <label className="label">Linked Account</label>
                <select {...register('accountId')} className="input">
                  <option value="">Select account</option>
                  {accounts.map((a: any) => <option key={a._id} value={a._id}>{a.name}</option>)}
                </select>
                {errors.accountId && <p className="text-xs text-rose-400 mt-1">{errors.accountId.message}</p>}
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
                <input {...register('notes')} placeholder="Optional note" className="input" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={create.isPending} className="btn-primary flex-1">
                  {create.isPending ? 'Saving…' : 'Create Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditItem(null)} />
          <div className="relative z-10 w-full max-w-md bg-[#121422] border border-white/10 rounded-2xl p-6 shadow-2xl shadow-black/80 ring-1 ring-white/5 animate-slide-up max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-4">Edit Recurring Schedule</h2>
            <form onSubmit={editSubmit(d => update.mutate({ id: editItem._id, data: d }))} className="space-y-4">
              <div>
                <label className="label">Title</label>
                <input {...editReg('title')} className="input" />
                {editErrors.title && <p className="text-xs text-rose-400 mt-1">{editErrors.title.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Amount</label>
                  <input {...editReg('amount')} type="number" step="0.01" className="input font-mono" />
                  {editErrors.amount && <p className="text-xs text-rose-400 mt-1">{editErrors.amount.message}</p>}
                </div>
                <div>
                  <label className="label">Type</label>
                  <select {...editReg('transactionType')} className="input">
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                    <option value="investment">Investment</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Frequency</label>
                  <select {...editReg('frequencyType')} className="input">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="custom">Custom (X days)</option>
                  </select>
                </div>
                {editFreqType === 'custom' && (
                  <div>
                    <label className="label">Every X Days</label>
                    <input {...editReg('customDays')} type="number" className="input" />
                  </div>
                )}
              </div>
              <div>
                <label className="label">Next Due Date</label>
                <input {...editReg('nextDueDate')} type="date" className="input" />
              </div>
              <div>
                <label className="label">Linked Account</label>
                <select {...editReg('accountId')} className="input">
                  <option value="">Select account</option>
                  {accounts.map((a: any) => <option key={a._id} value={a._id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Category (optional)</label>
                <select {...editReg('categoryId')} className="input">
                  <option value="">None</option>
                  {categories.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Notes</label>
                <input {...editReg('notes')} className="input" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditItem(null)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={update.isPending} className="btn-primary flex-1">
                  {update.isPending ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
