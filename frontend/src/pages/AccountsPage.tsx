import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountsAPI } from '../services/api';
import { formatCurrency } from '../utils';
import { useAuth } from '../store/auth';
import { Plus, Archive, Wallet, Landmark, CreditCard, Banknote, Smartphone, Pencil, Lock, ShieldCheck } from 'lucide-react';
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

const editSchema = z.object({
  name: z.string().min(1, 'Name required'),
  color: z.string().default('#6366f1'),
});

type FormData = z.infer<typeof schema>;
type EditFormData = z.infer<typeof editSchema>;

const ACCOUNT_ICONS: Record<string, any> = {
  salary: Banknote,
  savings: Landmark,
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
  const [editAccount, setEditAccount] = useState<any>(null);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsAPI.list().then(r => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => accountsAPI.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Account created successfully');
      setShowAdd(false);
      reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to create account'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditFormData }) => accountsAPI.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Account updated successfully');
      setEditAccount(null);
      editReset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update account'),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => accountsAPI.archive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Account archived');
    },
  });

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'savings', color: '#6366f1' },
  });

  const { register: editReg, handleSubmit: editSubmit, watch: editWatch, setValue: editSet, reset: editReset, formState: { errors: editErrors } } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
  });

  const selectedColor = watch('color');
  const editColor = editWatch('color');
  const totalBalance = accounts.reduce((sum: number, a: any) =>
    a.type === 'credit_card' ? sum - a.currentBalance : sum + a.currentBalance, 0);

  const openEdit = (acc: any) => {
    editReset({ name: acc.name, color: acc.color });
    setEditAccount(acc);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Accounts</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Total Net Balance: <span className="font-mono text-white font-bold">{formatCurrency(totalBalance, currency)}</span>
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          <span>Add Account</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16 text-slate-500">Loading accounts…</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc: any) => {
            const Icon = ACCOUNT_ICONS[acc.type] || Wallet;
            const isCredit = acc.type === 'credit_card';
            return (
              <div key={acc._id} className="card p-5 group relative hover:border-white/[0.14] transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/5"
                      style={{ background: acc.color + '18', color: acc.color }}
                    >
                      <Icon size={20} />
                    </div>
                    <div>
                      <div className="font-semibold text-white tracking-tight">{acc.name}</div>
                      <div className="text-xs text-slate-500 capitalize">{acc.type.replace('_', ' ')}</div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(acc)}
                      className="btn-ghost p-1.5 text-blue-400 hover:text-blue-300"
                      title="Edit"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Archive account "${acc.name}"?`)) {
                          archiveMutation.mutate(acc._id);
                        }
                      }}
                      className="btn-ghost p-1.5 text-slate-500 hover:text-amber-400"
                      title="Archive"
                    >
                      <Archive size={15} />
                    </button>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Current Balance</div>
                  <div className={cn('text-2xl font-bold font-mono', isCredit ? 'text-amber-400' : acc.currentBalance < 0 ? 'text-rose-400' : 'text-white')}>
                    {formatCurrency(acc.currentBalance, currency)}
                  </div>
                  {acc.openingBalance !== acc.currentBalance && (
                    <div className="text-xs text-slate-500 mt-1 font-mono">
                      Opening: {formatCurrency(acc.openingBalance, currency)}
                    </div>
                  )}

                  {/* Locked Goal Reserve */}
                  {acc.lockedAmount > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/[0.06]">
                      <div className="flex items-center justify-between text-xs text-brand-300">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Lock size={12} className="text-brand-400" />
                          <span>Goal Reserves</span>
                        </span>
                        <span className="font-mono">{formatCurrency(acc.lockedAmount, currency)}</span>
                      </div>
                      <div className="w-full bg-white/[0.08] rounded-full h-1 mt-1.5 overflow-hidden">
                        <div
                          className="h-1 rounded-full bg-brand-500"
                          style={{ width: `${Math.min(100, (acc.lockedAmount / Math.max(acc.currentBalance, 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {accounts.length === 0 && (
            <div className="sm:col-span-2 lg:col-span-3 text-center py-16 card">
              <p className="text-slate-300 font-medium mb-1">No accounts found</p>
              <p className="text-xs text-slate-500 mb-4">Add your bank accounts, credit cards, or digital wallets to start tracking</p>
              <button onClick={() => setShowAdd(true)} className="btn-primary text-xs inline-flex items-center gap-1.5">
                <Plus size={14} /> Add First Account
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
            <h2 className="text-lg font-semibold text-white mb-4">Add New Account</h2>
            <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="label">Account Name</label>
                <input {...register('name')} placeholder="e.g. HDFC Savings, Kotak, Chase" className="input" />
                {errors.name && <p className="text-xs text-rose-400 mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="label">Account Type</label>
                <select {...register('type')} className="input">
                  <option value="savings">Savings Account</option>
                  <option value="salary">Salary Account</option>
                  <option value="cash">Cash / Physical</option>
                  <option value="wallet">Digital Wallet / UPI</option>
                  <option value="credit_card">Credit Card</option>
                </select>
              </div>
              <div>
                <label className="label">Opening Balance</label>
                <input {...register('openingBalance')} type="number" step="0.01" placeholder="0.00" className="input font-mono" />
              </div>
              <div>
                <label className="label">Color Theme</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setValue('color', c)}
                      className={cn(
                        'w-7 h-7 rounded-lg transition-all',
                        selectedColor === c ? 'ring-2 ring-white/50 ring-offset-2 ring-offset-[#0d0d1a] scale-110' : ''
                      )}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1">
                  {createMutation.isPending ? 'Creating…' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditAccount(null)} />
          <div className="relative z-10 w-full max-w-md bg-[#121422] border border-white/10 rounded-2xl p-6 shadow-2xl shadow-black/80 ring-1 ring-white/5 animate-slide-up">
            <h2 className="text-lg font-semibold text-white mb-4">Edit Account</h2>
            <form onSubmit={editSubmit(d => updateMutation.mutate({ id: editAccount._id, data: d }))} className="space-y-4">
              <div>
                <label className="label">Account Name</label>
                <input {...editReg('name')} className="input" />
                {editErrors.name && <p className="text-xs text-rose-400 mt-1">{editErrors.name.message}</p>}
              </div>
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-xs text-slate-400">
                Account type and opening balance are permanent setup parameters.
              </div>
              <div>
                <label className="label">Color Theme</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => editSet('color', c)}
                      className={cn(
                        'w-7 h-7 rounded-lg transition-all',
                        editColor === c ? 'ring-2 ring-white/50 ring-offset-2 ring-offset-[#0d0d1a] scale-110' : ''
                      )}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditAccount(null)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={updateMutation.isPending} className="btn-primary flex-1">
                  {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
