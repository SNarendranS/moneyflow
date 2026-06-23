import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { lendingAPI, accountsAPI } from '../services/api';
import { formatCurrency, formatDate } from '../utils';
import { useAuth } from '../store/auth';
import { Plus, Trash2, Coins, ArrowDownToLine, ArrowUpFromLine, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '../utils';

const createSchema = z.object({
  direction: z.enum(['lent', 'borrowed']),
  personName: z.string().min(1, 'Name required'),
  amount: z.coerce.number().positive(),
  accountId: z.string().min(1, 'Account required'),
  date: z.string().min(1),
  expectedReturnDate: z.string().optional(),
  notes: z.string().optional(),
});
const settleSchema = z.object({
  amount: z.coerce.number().positive(),
  accountId: z.string().min(1, 'Account required'),
  notes: z.string().optional(),
});
type CreateForm = z.infer<typeof createSchema>;
type SettleForm = z.infer<typeof settleSchema>;

const FILTERS = [
  { value: 'all', label: 'All' },
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

  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => accountsAPI.list().then(r => r.data.data) });

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
      toast.success('Entry recorded!');
      setShowAdd(false);
      reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const settleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SettleForm }) => lendingAPI.settle(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lending'] });
      qc.invalidateQueries({ queryKey: ['lending-summary'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Settlement recorded!');
      setSettleFor(null);
      settleReset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
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
    const remaining = l.amount - l.settledAmount;
    const isLent = l.direction === 'lent';
    return (
      <div className="card p-4 group">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center',
              isLent ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400')}>
              {isLent ? <ArrowUpFromLine size={16}/> : <ArrowDownToLine size={16}/>}
            </div>
            <div>
              <div className="font-medium text-white">{l.personName}</div>
              <div className="text-xs text-gray-500">
                {isLent ? 'You lent' : 'You borrowed'} · {formatDate(l.date)}
                {l.expectedReturnDate && ` · due ${formatDate(l.expectedReturnDate)}`}
              </div>
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => { if(confirm('Delete this entry? Unsettled balance will be reversed.')) deleteMutation.mutate(l._id); }} className="btn-ghost p-1.5 text-red-400">
              <Trash2 size={14}/>
            </button>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500">{l.status === 'settled' ? 'Fully settled' : 'Remaining'}</div>
            <div className={cn('font-mono font-semibold', isLent ? 'text-emerald-400' : 'text-amber-400')}>
              {l.status === 'settled' ? formatCurrency(l.amount, currency) : formatCurrency(remaining, currency)}
            </div>
            {l.settledAmount > 0 && l.status !== 'settled' && (
              <div className="text-xs text-gray-500 mt-0.5">{formatCurrency(l.settledAmount, currency)} of {formatCurrency(l.amount, currency)} settled</div>
            )}
          </div>
          {l.status === 'settled' ? (
            <span className="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 size={11}/> Settled
            </span>
          ) : (
            <button onClick={() => openSettle(l)} className="btn-primary text-sm px-3 py-1.5">
              {isLent ? 'Mark Repaid' : 'Pay Back'}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Lending & Borrowing</h1>
          <p className="text-muted mt-0.5">Track money you've lent or borrowed from people</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2"><Plus size={16}/> Add Entry</button>
      </div>

      {/* Summary cards */}
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="stat-card">
          <span className="text-muted">Owed to you</span>
          <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">{formatCurrency(summary?.totalOwedToYou || 0, currency)}</div>
        </div>
        <div className="stat-card">
          <span className="text-muted">You owe</span>
          <div className="text-2xl font-bold text-amber-400 font-mono mt-1">{formatCurrency(summary?.totalYouOwe || 0, currency)}</div>
        </div>
        <div className="stat-card">
          <span className="text-muted">Net position</span>
          <div className={cn('text-2xl font-bold font-mono mt-1', (summary?.netPosition || 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
            {formatCurrency(summary?.netPosition || 0, currency)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              statusFilter === f.value
                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:border-white/20'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"/></div>
      ) : lendings.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <Coins size={40} className="mx-auto mb-3 opacity-30"/>
          <p className="text-lg mb-1">No lending entries yet</p>
          <p className="text-sm">Track money lent to friends or borrowed from others</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {lendings.map((l: any) => <LendingCard key={l._id} l={l}/>)}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAdd(false)}/>
          <div className="relative z-10 w-full max-w-md card p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-5">New Lending Entry</h2>
            <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-1.5">
                <label className={cn(
                  'flex items-center justify-center py-2.5 rounded-xl border text-sm font-medium cursor-pointer transition-all',
                  direction === 'lent' ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' : 'border-white/10 text-gray-500 hover:border-white/20'
                )}>
                  <input {...register('direction')} type="radio" value="lent" className="sr-only"/>
                  I lent money
                </label>
                <label className={cn(
                  'flex items-center justify-center py-2.5 rounded-xl border text-sm font-medium cursor-pointer transition-all',
                  direction === 'borrowed' ? 'text-amber-400 border-amber-500/40 bg-amber-500/10' : 'border-white/10 text-gray-500 hover:border-white/20'
                )}>
                  <input {...register('direction')} type="radio" value="borrowed" className="sr-only"/>
                  I borrowed money
                </label>
              </div>

              <div>
                <label className="label">Person's Name</label>
                <input {...register('personName')} placeholder="e.g. Rahul, Priya" className="input"/>
                {errors.personName && <p className="text-xs text-red-400 mt-1">{errors.personName.message}</p>}
              </div>

              <div>
                <label className="label">Amount</label>
                <input {...register('amount')} type="number" step="0.01" placeholder="0.00" className="input font-mono"/>
                {errors.amount && <p className="text-xs text-red-400 mt-1">{errors.amount.message}</p>}
              </div>

              <div>
                <label className="label">{direction === 'lent' ? 'From which account did you pay?' : 'Which account received the money?'}</label>
                <select {...register('accountId')} className="input">
                  <option value="">Select account</option>
                  {accounts.map((a: any) => <option key={a._id} value={a._id}>{a.name}</option>)}
                </select>
                {errors.accountId && <p className="text-xs text-red-400 mt-1">{errors.accountId.message}</p>}
              </div>

              <div>
                <label className="label">Date</label>
                <input {...register('date')} type="date" className="input"/>
              </div>

              <div>
                <label className="label">Expected Return Date (optional)</label>
                <input {...register('expectedReturnDate')} type="date" className="input"/>
              </div>

              <div>
                <label className="label">Notes (optional)</label>
                <input {...register('notes')} placeholder="What was this for?" className="input"/>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1">{createMutation.isPending ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Modal */}
      {settleFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSettleFor(null)}/>
          <div className="relative z-10 w-full max-w-sm card p-6 animate-slide-up">
            <h2 className="text-lg font-semibold text-white mb-1">
              {settleFor.direction === 'lent' ? 'Record Repayment' : 'Record Payback'}
            </h2>
            <p className="text-muted text-sm mb-5">
              {settleFor.personName} · remaining {formatCurrency(settleFor.amount - settleFor.settledAmount, currency)}
            </p>
            <form onSubmit={settleSubmit(d => settleMutation.mutate({ id: settleFor._id, data: d }))} className="space-y-4">
              <div>
                <label className="label">Amount</label>
                <input {...settleReg('amount')} type="number" step="0.01" className="input font-mono"/>
                {settleErrors.amount && <p className="text-xs text-red-400 mt-1">{settleErrors.amount.message}</p>}
                <p className="text-xs text-gray-500 mt-1">You can settle partially if only part of it was paid back.</p>
              </div>
              <div>
                <label className="label">{settleFor.direction === 'lent' ? 'Which account is receiving it?' : 'Which account are you paying from?'}</label>
                <select {...settleReg('accountId')} className="input">
                  <option value="">Select account</option>
                  {accounts.map((a: any) => <option key={a._id} value={a._id}>{a.name}</option>)}
                </select>
                {settleErrors.accountId && <p className="text-xs text-red-400 mt-1">{settleErrors.accountId.message}</p>}
              </div>
              <div>
                <label className="label">Notes (optional)</label>
                <input {...settleReg('notes')} placeholder="Add a note…" className="input"/>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setSettleFor(null)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={settleMutation.isPending} className="btn-primary flex-1">{settleMutation.isPending ? 'Saving…' : 'Confirm'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
