import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { goalsAPI, accountsAPI } from '../services/api';
import { formatCurrency, formatDate } from '../utils';
import { useAuth } from '../store/auth';
import {
  Plus, Trash2, Target, PlusCircle, Pencil, Lock,
  Unlock, CheckCircle2, Trophy, Clock, Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '../utils';
import { differenceInDays } from 'date-fns';

const goalSchema = z.object({
  title: z.string().min(1, 'Title required'),
  targetAmount: z.coerce.number().positive('Must be positive'),
  targetDate: z.string().min(1, 'Date required'),
  color: z.string().default('#6366f1'),
});

const contribSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  accountId: z.string().min(1, 'Select an account'),
  notes: z.string().optional()
});

type GoalForm = z.infer<typeof goalSchema>;
type ContribForm = z.infer<typeof contribSchema>;

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function GoalsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const currency = user?.currency || 'INR';
  const [showAdd, setShowAdd] = useState(false);
  const [editGoal, setEditGoal] = useState<any>(null);
  const [contributeFor, setContributeFor] = useState<any>(null);
  const [manageFor, setManageFor] = useState<any>(null);

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsAPI.list().then(r => r.data.data)
  });

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: () => goalsAPI.list().then(r => r.data.data),
  });

  const { data: contributions = [] } = useQuery({
    queryKey: ['goal-contributions', manageFor?._id],
    queryFn: () => goalsAPI.contributions(manageFor._id).then(r => r.data.data),
    enabled: !!manageFor,
  });

  const createGoal = useMutation({
    mutationFn: (d: GoalForm) => goalsAPI.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Goal created successfully');
      setShowAdd(false);
      goalReset();
    },
    onError: () => toast.error('Failed to create goal'),
  });

  const updateGoal = useMutation({
    mutationFn: ({ id, data }: { id: string; data: GoalForm }) => goalsAPI.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Goal updated');
      setEditGoal(null);
      editReset();
    },
    onError: () => toast.error('Failed to update goal'),
  });

  const deleteGoal = useMutation({
    mutationFn: (id: string) => goalsAPI.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Goal deleted and locked funds released');
    },
  });

  const contribute = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ContribForm }) => goalsAPI.contribute(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Contribution added');
      setContributeFor(null);
      contribReset();
    },
    onError: () => toast.error('Failed to add contribution'),
  });

  const deleteContribution = useMutation({
    mutationFn: ({ goalId, contributionId }: { goalId: string; contributionId: string }) =>
      goalsAPI.deleteContribution(goalId, contributionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      qc.invalidateQueries({ queryKey: ['goal-contributions'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Funds unlocked');
    },
    onError: () => toast.error('Failed to remove contribution'),
  });

  const { register: goalReg, handleSubmit: goalSubmit, watch: goalWatch, setValue: goalSet, reset: goalReset, formState: { errors: goalErrors } } = useForm<GoalForm>({
    resolver: zodResolver(goalSchema),
    defaultValues: { color: '#6366f1' },
  });

  const { register: editReg, handleSubmit: editSubmit, watch: editWatch, setValue: editSet, reset: editReset, formState: { errors: editErrors } } = useForm<GoalForm>({
    resolver: zodResolver(goalSchema),
  });

  const { register: contribReg, handleSubmit: contribSubmit, reset: contribReset, formState: { errors: contribErrors } } = useForm<ContribForm>({
    resolver: zodResolver(contribSchema),
  });

  const selColor = goalWatch('color');
  const editColor = editWatch('color');
  const active = goals.filter((g: any) => !g.isCompleted);
  const completed = goals.filter((g: any) => g.isCompleted);

  const openEdit = (goal: any) => {
    editReset({
      title: goal.title,
      targetAmount: goal.targetAmount,
      targetDate: goal.targetDate?.split('T')[0],
      color: goal.color,
    });
    setEditGoal(goal);
  };

  const GoalCard = ({ goal }: { goal: any }) => {
    const pct = Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100));
    const daysLeft = differenceInDays(new Date(goal.targetDate), new Date());
    const remaining = Math.max(0, goal.targetAmount - goal.savedAmount);
    const monthsLeft = daysLeft / 30;
    const monthlyNeeded = monthsLeft > 0 ? remaining / monthsLeft : 0;

    return (
      <div className="card p-5 group relative hover:border-white/[0.14] transition-all">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/5"
              style={{ background: goal.color + '18', color: goal.color }}
            >
              <Target size={20} />
            </div>
            <div>
              <div className="font-semibold text-white tracking-tight">{goal.title}</div>
              <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <Calendar size={11} />
                <span>Target: {formatDate(goal.targetDate)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!goal.isCompleted && (
              <button
                onClick={() => setContributeFor(goal)}
                className="btn-ghost p-1.5 text-brand-400 hover:text-brand-300"
                title="Add contribution"
              >
                <PlusCircle size={16} />
              </button>
            )}
            <button
              onClick={() => openEdit(goal)}
              className="opacity-0 group-hover:opacity-100 btn-ghost p-1.5 text-blue-400 hover:text-blue-300 transition-opacity"
              title="Edit goal"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={() => {
                if (confirm('Delete goal? This will unlock all reserved funds.')) {
                  deleteGoal.mutate(goal._id);
                }
              }}
              className="opacity-0 group-hover:opacity-100 btn-ghost p-1.5 text-rose-400 hover:text-rose-300 transition-opacity"
              title="Delete goal"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Progress Bar & Saved Amount */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-400 uppercase tracking-wider text-[11px]">Saved Balance</span>
            <span className="font-mono text-white">{formatCurrency(goal.savedAmount, currency)}</span>
          </div>
          <div className="w-full bg-white/[0.08] rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: goal.isCompleted ? '#10b981' : goal.color,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span className="font-mono font-semibold" style={{ color: goal.isCompleted ? '#10b981' : goal.color }}>
              {pct}% complete
            </span>
            <span className="font-mono">Target: {formatCurrency(goal.targetAmount, currency)}</span>
          </div>
        </div>

        {!goal.isCompleted && (
          <div className="mt-4 pt-3.5 border-t border-white/[0.06] grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-slate-500">Remaining to Save</div>
              <div className="font-mono text-white font-semibold mt-0.5">{formatCurrency(remaining, currency)}</div>
            </div>
            <div>
              <div className="text-slate-500">{daysLeft >= 0 ? 'Monthly Required' : 'Status'}</div>
              <div className={cn('font-mono font-semibold mt-0.5', daysLeft < 0 ? 'text-rose-400' : 'text-white')}>
                {daysLeft >= 0 ? formatCurrency(monthlyNeeded, currency) : `${Math.abs(daysLeft)}d overdue`}
              </div>
            </div>
          </div>
        )}

        {goal.isCompleted && (
          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-center gap-1.5 text-emerald-400 text-xs font-semibold">
            <Trophy size={14} />
            <span>Goal Achieved</span>
          </div>
        )}

        {goal.savedAmount > 0 && (
          <button
            onClick={() => setManageFor(goal)}
            className="mt-3 w-full text-xs text-brand-300 hover:text-white flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors"
          >
            <Lock size={12} className="text-brand-400" />
            <span>{formatCurrency(goal.savedAmount, currency)} locked — Manage funds</span>
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Financial Goals</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {active.length} active target{active.length === 1 ? '' : 's'}, {completed.length} completed
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          <span>New Goal</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16 text-slate-500">Loading goals…</div>
      ) : (
        <div className="space-y-8">
          {/* Active Goals */}
          {active.length > 0 && (
            <div>
              <h2 className="section-title mb-3">Active Goals</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {active.map((g: any) => <GoalCard key={g._id} goal={g} />)}
              </div>
            </div>
          )}

          {/* Completed Goals */}
          {completed.length > 0 && (
            <div>
              <h2 className="section-title mb-3 text-emerald-400 flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>Completed Goals</span>
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {completed.map((g: any) => <GoalCard key={g._id} goal={g} />)}
              </div>
            </div>
          )}

          {goals.length === 0 && (
            <div className="text-center py-16 card">
              <p className="text-slate-300 font-medium mb-1">No goals set yet</p>
              <p className="text-xs text-slate-500 mb-4">Set target savings for an emergency fund, travel, or vehicle</p>
              <button onClick={() => setShowAdd(true)} className="btn-primary text-xs inline-flex items-center gap-1.5">
                <Plus size={14} /> Create First Goal
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add Goal Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative z-10 w-full max-w-md bg-[#121422] border border-white/10 rounded-2xl p-6 shadow-2xl shadow-black/80 ring-1 ring-white/5 animate-slide-up">
            <h2 className="text-lg font-semibold text-white mb-4">New Goal</h2>
            <form onSubmit={goalSubmit(d => createGoal.mutate(d))} className="space-y-4">
              <div>
                <label className="label">Goal Title</label>
                <input {...goalReg('title')} placeholder="e.g. Emergency Fund, New Car, Vacation" className="input" />
                {goalErrors.title && <p className="text-xs text-rose-400 mt-1">{goalErrors.title.message}</p>}
              </div>
              <div>
                <label className="label">Target Amount</label>
                <input {...goalReg('targetAmount')} type="number" step="0.01" placeholder="0.00" className="input font-mono" />
                {goalErrors.targetAmount && <p className="text-xs text-rose-400 mt-1">{goalErrors.targetAmount.message}</p>}
              </div>
              <div>
                <label className="label">Target Date</label>
                <input {...goalReg('targetDate')} type="date" className="input" />
                {goalErrors.targetDate && <p className="text-xs text-rose-400 mt-1">{goalErrors.targetDate.message}</p>}
              </div>
              <div>
                <label className="label">Color Accent</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => goalSet('color', c)}
                      className={cn(
                        'w-7 h-7 rounded-lg transition-all',
                        selColor === c ? 'ring-2 ring-white/50 ring-offset-2 ring-offset-[#0d0d1a] scale-110' : ''
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
                <button type="submit" disabled={createGoal.isPending} className="btn-primary flex-1">
                  {createGoal.isPending ? 'Creating…' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Goal Modal */}
      {editGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditGoal(null)} />
          <div className="relative z-10 w-full max-w-md bg-[#121422] border border-white/10 rounded-2xl p-6 shadow-2xl shadow-black/80 ring-1 ring-white/5 animate-slide-up">
            <h2 className="text-lg font-semibold text-white mb-4">Edit Goal</h2>
            <form onSubmit={editSubmit(d => updateGoal.mutate({ id: editGoal._id, data: d }))} className="space-y-4">
              <div>
                <label className="label">Goal Title</label>
                <input {...editReg('title')} className="input" />
                {editErrors.title && <p className="text-xs text-rose-400 mt-1">{editErrors.title.message}</p>}
              </div>
              <div>
                <label className="label">Target Amount</label>
                <input {...editReg('targetAmount')} type="number" step="0.01" className="input font-mono" />
              </div>
              <div>
                <label className="label">Target Date</label>
                <input {...editReg('targetDate')} type="date" className="input" />
              </div>
              <div>
                <label className="label">Color Accent</label>
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
                <button type="button" onClick={() => setEditGoal(null)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={updateGoal.isPending} className="btn-primary flex-1">
                  {updateGoal.isPending ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contribution Modal */}
      {contributeFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setContributeFor(null)} />
          <div className="relative z-10 w-full max-w-md bg-[#121422] border border-white/10 rounded-2xl p-6 shadow-2xl shadow-black/80 ring-1 ring-white/5 animate-slide-up">
            <h2 className="text-lg font-semibold text-white mb-1">Add Contribution</h2>
            <p className="text-xs text-slate-400 mb-4">
              Funds will be locked in the chosen account and tracked toward "{contributeFor.title}".
            </p>
            <form onSubmit={contribSubmit(d => contribute.mutate({ id: contributeFor._id, data: d }))} className="space-y-4">
              <div>
                <label className="label">Contribution Amount</label>
                <input {...contribReg('amount')} type="number" step="0.01" placeholder="0.00" className="input font-mono text-lg" />
                {contribErrors.amount && <p className="text-xs text-rose-400 mt-1">{contribErrors.amount.message}</p>}
              </div>
              <div>
                <label className="label">Source Account (Locks funds)</label>
                <select {...contribReg('accountId')} className="input">
                  <option value="">Select account</option>
                  {accounts?.map((a: any) => (
                    <option key={a._id} value={a._id}>
                      {a.name} ({formatCurrency(a.currentBalance, currency)})
                    </option>
                  ))}
                </select>
                {contribErrors.accountId && <p className="text-xs text-rose-400 mt-1">{contribErrors.accountId.message}</p>}
              </div>
              <div>
                <label className="label">Note (optional)</label>
                <input {...contribReg('notes')} placeholder="e.g. Monthly allocation" className="input" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setContributeFor(null)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={contribute.isPending} className="btn-primary flex-1">
                  {contribute.isPending ? 'Locking Funds…' : 'Lock Contribution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Locked Funds Modal */}
      {manageFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setManageFor(null)} />
          <div className="relative z-10 w-full max-w-lg bg-[#121422] border border-white/10 rounded-2xl p-6 shadow-2xl shadow-black/80 ring-1 ring-white/5 animate-slide-up">
            <h2 className="text-lg font-semibold text-white mb-1">Locked Funds Breakdown</h2>
            <p className="text-xs text-slate-400 mb-4">
              Contributions locked for <span className="text-white font-medium">"{manageFor.title}"</span>. Unlocking releases funds back to available account balance.
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto mb-4">
              {contributions.map((c: any) => (
                <div key={c._id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div>
                    <div className="text-sm font-medium text-white font-mono">{formatCurrency(c.amount, currency)}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span>{c.accountId?.name || 'Account'}</span>
                      <span>·</span>
                      <span>{formatDate(c.date)}</span>
                      {c.notes && <span>· {c.notes}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Unlock ${formatCurrency(c.amount, currency)} back to account?`)) {
                        deleteContribution.mutate({ goalId: manageFor._id, contributionId: c._id });
                      }
                    }}
                    className="btn-ghost p-1.5 text-rose-400 hover:text-rose-300 flex items-center gap-1 text-xs"
                    title="Unlock funds"
                  >
                    <Unlock size={13} />
                    <span>Unlock</span>
                  </button>
                </div>
              ))}
              {contributions.length === 0 && (
                <p className="text-center py-6 text-slate-500 text-xs">No active contributions found</p>
              )}
            </div>

            <button type="button" onClick={() => setManageFor(null)} className="btn-secondary w-full">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
