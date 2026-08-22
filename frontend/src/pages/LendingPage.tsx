import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { lendingAPI, accountsAPI } from '../services/api';
import { formatCurrency, formatDate } from '../utils';
import { useAuth } from '../store/auth';
import { Plus, Trash2, Coins, ArrowDownToLine, ArrowUpFromLine, CheckCircle2, ChevronRight, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '../utils';

const createSchema = z.object({
  direction: z.enum(['lent', 'borrowed']),
  personName: z.string().min(1, 'Name required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  accountId: z.string().min(1, 'Account required'),
  date: z.string().min(1, 'Date required'),
  expectedReturnDate: z.string().optional(),
  notes: z.string().optional(),
});

const settleSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  accountId: z.string().min(1, 'Account required'),
  notes: z.string().optional(),
});

type CreateForm = z.infer<typeof createSchema>;
type SettleForm = z.infer<typeof settleSchema>;

const FILTERS = [
  { value: 'all', label: 'All Items' },
  { value: 'pending', label: 'Pending' },
  { value: 'partially_settled', label: 'Partial' },
  { value: 'settled', label: 'Settled' },
];

export default function LendingPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const currency = user?.currency || 'INR';
  const [showAdd, setShowAdd] = useState(false);
  const [settleFor, setSettleFor] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsAPI.list().then(r => r.data.data)
  });

  const { data: lendings = [], isLoading } = useQuery({
    queryKey: ['lending', statusFilter],
    queryFn: () => lendingAPI.list(statusFilter !== 'all' ? { status: statusFilter } : undefined).then(r => r.data.data),
  });

  const { data: summary } = useQuery({
    queryKey: ['lending-summary'],
    queryFn: () => lendingAPI.summary().then(r => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: CreateForm) => lendingAPI.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lending'] });
      qc.invalidateQueries({ queryKey: ['lending-summary'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Entry recorded');
      setShowAdd(false);
      reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to record entry'),
  });

  const settleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SettleForm }) => lendingAPI.settle(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lending'] });
      qc.invalidateQueries({ queryKey: ['lending-summary'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Settlement recorded');
      setSettleFor(null);
      settleReset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to record settlement'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => lendingAPI.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lending'] });
      qc.invalidateQueries({ queryKey: ['lending-summary'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Entry deleted');
    },
  });

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { direction: 'lent', date: new Date().toISOString().split('T')[0] },
  });

  const { register: settleReg, handleSubmit: settleSubmit, reset: settleReset, formState: { errors: settleErrors } } = useForm<SettleForm>({
    resolver: zodResolver(settleSchema),
  });

  const direction = watch('direction');

  const openSettle = (l: any) => {
    settleReset({ amount: l.amount - l.settledAmount, accountId: l.accountId?._id || l.accountId });
    setSettleFor(l);
  };

  const LendingCard = ({ l }: { l: any }) => {
    const remaining = Math.max(0, l.amount - l.settledAmount);
    const isLent = l.direction === 'lent';
    const isSettled = l.status === 'settled';
    const progressPct = Math.min(100, Math.round((l.settledAmount / l.amount) * 100));

    return (
      <div className="card p-5 group hover:border-white/[0.14] transition-all">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center border',
                isLent ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              )}
            >
              {isLent ? <ArrowUpFromLine size={18} /> : <ArrowDownToLine size={18} />}
            </div>
            <div>
              <div className="font-semibold text-white tracking-tight flex items-center gap-2">
                <span>{l.personName}</span>
                <span className={cn('badge py-0.2 text-[10px]', isLent ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20')}>
                  {isLent ? 'Lent' : 'Borrowed'}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                <span>{formatDate(l.date)}</span>
                {l.expectedReturnDate && <span> · Expected {formatDate(l.expectedReturnDate)}</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => {
                if (confirm('Delete this entry? Unsettled balance will be restored in your account.')) {
                  deleteMutation.mutate(l._id);
                }
              }}
              className="btn-ghost p-1.5 text-rose-400 hover:text-rose-300"
              title="Delete"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Amount & Progress */}
        <div className="mt-4 pt-3.5 border-t border-white/[0.06] flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {isSettled ? 'Settled Total' : 'Remaining Balance'}
            </div>
            <div className={cn('font-mono font-bold text-lg', isLent ? 'text-emerald-400' : 'text-amber-400')}>
              {isSettled ? formatCurrency(l.amount, currency) : formatCurrency(remaining, currency)}
            </div>
            {l.settledAmount > 0 && !isSettled && (
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                {formatCurrency(l.settledAmount, currency)} of {formatCurrency(l.amount, currency)} settled ({progressPct}%)
              </div>
            )}
          </div>
          {isSettled ? (
            <span className="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 size={12} />
              <span>Settled</span>
            </span>
          ) : (
            <button onClick={() => openSettle(l)} className="btn-primary text-xs py-1.5 px-3 shadow-sm">
              {isLent ? 'Mark Repaid' : 'Pay Back'}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Lending & Borrowing</h1>
          <p className="text-slate-400 text-sm mt-0.5">Track money lent to or borrowed from contacts</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          <span>New Entry</span>
        </button>
      </div>

      {/* Summary Metrics */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card p-5 border-emerald-500/20">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400/80">Owed to You</span>
          <div className="text-2xl font-bold text-emerald-400 font-mono mt-2 tracking-tight">
            {formatCurrency(summary?.totalOwedToYou || 0, currency)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Pending return from borrowers</p>
        </div>
        <div className="card p-5 border-amber-500/20">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400/80">You Owe</span>
          <div className="text-2xl font-bold text-amber-400 font-mono mt-2 tracking-tight">
            {formatCurrency(summary?.totalYouOwe || 0, currency)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Pending payment to lenders</p>
        </div>
        <div className="card p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Net Position</span>
          <div className={cn('text-2xl font-bold font-mono mt-2 tracking-tight', (summary?.netPosition || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
            {formatCurrency(summary?.netPosition || 0, currency)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Net receivable balance</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all border',
              statusFilter === f.value
                ? 'bg-brand-500/20 text-brand-300 border-brand-500/40 shadow-glow'
                : 'bg-white/[0.04] text-slate-400 border-white/[0.08] hover:text-white hover:bg-white/[0.08]'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      {isLoading ? (
        <div className="flex justify-center py-16 text-slate-500">Loading entries…</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lendings.map((l: any) => <LendingCard key={l._id} l={l} />)}
          {lendings.length === 0 && (
            <div className="sm:col-span-2 lg:col-span-3 text-center py-16 card">
              <Coins size={36} className="mx-auto mb-3 text-slate-600" />
              <p className="text-slate-300 font-medium mb-1">No lending records found</p>
              <p className="text-xs text-slate-500 mb-4">Record money lent to friends or borrowed from colleagues</p>
              <button onClick={() => setShowAdd(true)} className="btn-primary text-xs inline-flex items-center gap-1.5">
                <Plus size={14} /> Add First Entry
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative z-10 w-full max-w-md bg-[#121422] border border-white/10 rounded-2xl p-6 shadow-2xl shadow-black/80 ring-1 ring-white/5 animate-slide-up">
            <h2 className="text-lg font-semibold text-white mb-4">Record Lending / Borrowing</h2>
            <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
              {/* Direction selector */}
              <div>
                <label className="label">Direction</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={cn(
                    'flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all',
                    direction === 'lent' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-glow-emerald' : 'border-white/10 text-slate-400 bg-white/5'
                  )}>
                    <input {...register('direction')} type="radio" value="lent" className="sr-only" />
                    <ArrowUpFromLine size={15} />
                    <span>I Lent Money</span>
                  </label>
                  <label className={cn(
                    'flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all',
                    direction === 'borrowed' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'border-white/10 text-slate-400 bg-white/5'
                  )}>
                    <input {...register('direction')} type="radio" value="borrowed" className="sr-only" />
                    <ArrowDownToLine size={15} />
                    <span>I Borrowed Money</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="label">{direction === 'lent' ? "Borrower's Name" : "Lender's Name"}</label>
                <input {...register('personName')} placeholder="e.g. John Doe, Sarah" className="input" />
                {errors.personName && <p className="text-xs text-rose-400 mt-1">{errors.personName.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Amount</label>
                  <input {...register('amount')} type="number" step="0.01" placeholder="0.00" className="input font-mono" />
                  {errors.amount && <p className="text-xs text-rose-400 mt-1">{errors.amount.message}</p>}
                </div>
                <div>
                  <label className="label">Account</label>
                  <select {...register('accountId')} className="input">
                    <option value="">Select account</option>
                    {accounts.map((a: any) => <option key={a._id} value={a._id}>{a.name}</option>)}
                  </select>
                  {errors.accountId && <p className="text-xs text-rose-400 mt-1">{errors.accountId.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Date</label>
                  <input {...register('date')} type="date" className="input" />
                </div>
                <div>
                  <label className="label">Expected Return</label>
                  <input {...register('expectedReturnDate')} type="date" className="input" />
                </div>
              </div>

              <div>
                <label className="label">Note (optional)</label>
                <input {...register('notes')} placeholder="e.g. Dinner split, emergency help" className="input" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1">
                  {createMutation.isPending ? 'Recording…' : 'Record Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Modal */}
      {settleFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSettleFor(null)} />
          <div className="relative z-10 w-full max-w-md bg-[#121422] border border-white/10 rounded-2xl p-6 shadow-2xl shadow-black/80 ring-1 ring-white/5 animate-slide-up">
            <h2 className="text-lg font-semibold text-white mb-1">
              {settleFor.direction === 'lent' ? `Receive Payment from ${settleFor.personName}` : `Repay ${settleFor.personName}`}
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Total remaining: <span className="text-white font-mono font-bold">{formatCurrency(settleFor.amount - settleFor.settledAmount, currency)}</span>
            </p>
            <form onSubmit={settleSubmit(d => settleMutation.mutate({ id: settleFor._id, data: d }))} className="space-y-4">
              <div>
                <label className="label">Settlement Amount</label>
                <input {...settleReg('amount')} type="number" step="0.01" className="input font-mono text-lg" />
                {settleErrors.amount && <p className="text-xs text-rose-400 mt-1">{settleErrors.amount.message}</p>}
              </div>
              <div>
                <label className="label">Receiving / Paying Account</label>
                <select {...settleReg('accountId')} className="input">
                  <option value="">Select account</option>
                  {accounts.map((a: any) => <option key={a._id} value={a._id}>{a.name}</option>)}
                </select>
                {settleErrors.accountId && <p className="text-xs text-rose-400 mt-1">{settleErrors.accountId.message}</p>}
              </div>
              <div>
                <label className="label">Note (optional)</label>
                <input {...settleReg('notes')} placeholder="e.g. Partial repayment" className="input" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setSettleFor(null)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={settleMutation.isPending} className="btn-primary flex-1">
                  {settleMutation.isPending ? 'Recording…' : 'Record Settlement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
