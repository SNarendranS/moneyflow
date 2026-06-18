import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountsAPI } from '../services/api';
import { formatCurrency } from '../utils';
import { useAuth } from '../store/auth';
import { Plus, Archive, Wallet, PiggyBank, CreditCard, Banknote, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '../utils';

const schema = z.object({
  name: z.string().min(1, 'Name required'),
  type: z.enum(['salary', 'savings', 'cash', 'wallet', 'credit_card']),
  openingBalance: z.coerce.number().default(0),
  color: z.string().default('#6366f1'),
});
type FormData = z.infer<typeof schema>;

const ACCOUNT_ICONS: Record<string, any> = {
  salary: Banknote,
  savings: PiggyBank,
  cash: Wallet,
  wallet: Smartphone,
  credit_card: CreditCard,
};

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function AccountsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const currency = user?.currency || 'INR';
  const [showAdd, setShowAdd] = useState(false);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsAPI.list().then(r => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => accountsAPI.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Account created!');
      setShowAdd(false);
      reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => accountsAPI.archive(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); toast.success('Account archived'); },
  });

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'savings', color: '#6366f1' },
  });

  const selectedColor = watch('color');
  const totalBalance = accounts.reduce((sum: number, a: any) =>
    a.type === 'credit_card' ? sum - a.currentBalance : sum + a.currentBalance, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Accounts</h1>
          <p className="text-muted mt-0.5">Total balance: <span className="font-mono text-white font-semibold">{formatCurrency(totalBalance, currency)}</span></p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Account
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc: any) => {
            const Icon = ACCOUNT_ICONS[acc.type] || Wallet;
            return (
              <div key={acc._id} className="card p-5 group relative">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: acc.color + '22' }}>
                      <Icon size={20} style={{ color: acc.color }} />
                    </div>
                    <div>
                      <div className="font-semibold text-white">{acc.name}</div>
                      <div className="text-xs text-gray-500 capitalize">{acc.type.replace('_', ' ')}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => { if (confirm('Archive this account?')) archiveMutation.mutate(acc._id); }}
                    className="opacity-0 group-hover:opacity-100 btn-ghost p-1.5 text-gray-500 hover:text-amber-400"
                    title="Archive"
                  >
                    <Archive size={15} />
                  </button>
                </div>
                <div className="mt-4">
                  <div className="text-xs text-gray-500 mb-1">Current Balance</div>
                  <div className={cn('text-2xl font-bold font-mono', acc.currentBalance < 0 ? 'text-red-400' : 'text-white')}>
                    {formatCurrency(acc.currentBalance, currency)}
                  </div>
                  {acc.openingBalance !== acc.currentBalance && (
                    <div className="text-xs text-gray-500 mt-1">
                      Opening: {formatCurrency(acc.openingBalance, currency)}
                    </div>
                  )}
                  {acc.lockedAmount > 0 && (
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-brand-400/70">
                      <span>🔒</span>
                      <span>{formatCurrency(acc.lockedAmount, currency)} locked for goals</span>
                    </div>
                  )}
                  {acc.lockedAmount > 0 && (
                    <div className="w-full bg-white/10 rounded-full h-1 mt-2">
                      <div className="h-1 rounded-full bg-brand-500/50" style={{ width: `${Math.min(100, (acc.lockedAmount / Math.max(acc.currentBalance, 1)) * 100)}%` }}/>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {accounts.length === 0 && (
            <div className="sm:col-span-2 lg:col-span-3 text-center py-16 text-muted">
              No accounts yet. Add your first account!
            </div>
          )}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative z-10 w-full max-w-md card p-6 animate-slide-up">
            <h2 className="text-lg font-semibold text-white mb-5">Add Account</h2>
            <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="label">Account Name</label>
                <input {...register('name')} placeholder="e.g. HDFC Savings" className="input" />
                {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="label">Account Type</label>
                <select {...register('type')} className="input">
                  <option value="savings">Savings Account</option>
                  <option value="salary">Salary Account</option>
                  <option value="cash">Cash</option>
                  <option value="wallet">Wallet / UPI</option>
                  <option value="credit_card">Credit Card</option>
                </select>
              </div>
              <div>
                <label className="label">Opening Balance</label>
                <input {...register('openingBalance')} type="number" step="0.01" placeholder="0" className="input font-mono" />
              </div>
              <div>
                <label className="label">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setValue('color', c)}
                      className={cn('w-7 h-7 rounded-lg transition-all', selectedColor === c ? 'ring-2 ring-white/50 ring-offset-2 ring-offset-[#0d0d1a] scale-110' : '')}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1">
                  {createMutation.isPending ? 'Creating…' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
