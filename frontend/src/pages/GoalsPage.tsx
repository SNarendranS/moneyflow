import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { goalsAPI } from '../services/api';
import { formatCurrency, formatDate } from '../utils';
import { useAuth } from '../store/auth';
import { Plus, Trash2, Target, PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '../utils';
import { differenceInDays, format } from 'date-fns';

const goalSchema = z.object({
  title: z.string().min(1, 'Title required'),
  targetAmount: z.coerce.number().positive('Must be positive'),
  targetDate: z.string().min(1, 'Date required'),
  color: z.string().default('#6366f1'),
});
const contribSchema = z.object({ amount: z.coerce.number().positive(), notes: z.string().optional() });
type GoalForm = z.infer<typeof goalSchema>;
type ContribForm = z.infer<typeof contribSchema>;

const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899','#06b6d4'];

export default function GoalsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const currency = user?.currency || 'INR';
  const [showAdd, setShowAdd] = useState(false);
  const [contributeFor, setContributeFor] = useState<any>(null);

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: () => goalsAPI.list().then(r => r.data.data),
  });

  const createGoal = useMutation({
    mutationFn: (d: GoalForm) => goalsAPI.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Goal created!'); setShowAdd(false); goalReset(); },
    onError: () => toast.error('Failed'),
  });

  const deleteGoal = useMutation({
    mutationFn: (id: string) => goalsAPI.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Goal deleted'); },
  });

  const contribute = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ContribForm }) => goalsAPI.contribute(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Contribution added!'); setContributeFor(null); contribReset(); },
    onError: () => toast.error('Failed'),
  });

  const { register: goalReg, handleSubmit: goalSubmit, watch: goalWatch, setValue: goalSet, reset: goalReset, formState: { errors: goalErrors } } = useForm<GoalForm>({
    resolver: zodResolver(goalSchema), defaultValues: { color: '#6366f1' },
  });
  const { register: contribReg, handleSubmit: contribSubmit, reset: contribReset, formState: { errors: contribErrors } } = useForm<ContribForm>({
    resolver: zodResolver(contribSchema),
  });

  const selColor = goalWatch('color');
  const active = goals.filter((g: any) => !g.isCompleted);
  const completed = goals.filter((g: any) => g.isCompleted);

  const GoalCard = ({ goal }: { goal: any }) => {
    const pct = Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100));
    const daysLeft = differenceInDays(new Date(goal.targetDate), new Date());
    const remaining = goal.targetAmount - goal.savedAmount;
    const monthsLeft = daysLeft / 30;
    const monthlyNeeded = monthsLeft > 0 ? remaining / monthsLeft : 0;

    return (
      <div className="card p-5 group">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: goal.color + '22' }}>
              🎯
            </div>
            <div>
              <div className="font-semibold text-white">{goal.title}</div>
              <div className="text-xs text-gray-500">Target: {formatDate(goal.targetDate)}</div>
            </div>
          </div>
          <div className="flex gap-1">
            {!goal.isCompleted && (
              <button onClick={() => setContributeFor(goal)} className="btn-ghost p-1.5 text-brand-400 hover:text-brand-300">
                <PlusCircle size={15}/>
              </button>
            )}
            <button onClick={() => { if(confirm('Delete goal?')) deleteGoal.mutate(goal._id); }} className="opacity-0 group-hover:opacity-100 btn-ghost p-1.5 text-red-400 hover:text-red-300 transition-opacity">
              <Trash2 size={15}/>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Saved</span>
            <span className="font-mono text-white">{formatCurrency(goal.savedAmount, currency)}</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: goal.isCompleted ? '#10b981' : goal.color }}/>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>{pct}% complete</span>
            <span>{formatCurrency(goal.targetAmount, currency)} goal</span>
          </div>
        </div>

        {!goal.isCompleted && (
          <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-gray-500">Remaining</div>
              <div className="font-mono text-white mt-0.5">{formatCurrency(remaining, currency)}</div>
            </div>
            <div>
              <div className="text-gray-500">{daysLeft > 0 ? 'Monthly needed' : 'Overdue!'}</div>
              <div className={cn('font-mono mt-0.5', daysLeft < 0 ? 'text-red-400' : 'text-white')}>
                {daysLeft > 0 ? formatCurrency(monthlyNeeded, currency) : `${Math.abs(daysLeft)}d ago`}
              </div>
            </div>
          </div>
        )}

        {goal.isCompleted && (
          <div className="mt-3 pt-3 border-t border-white/5 text-center">
            <span className="text-emerald-400 text-sm font-medium">🎉 Goal Achieved!</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Financial Goals</h1>
          <p className="text-muted mt-0.5">{active.length} active, {completed.length} completed</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2"><Plus size={16}/> New Goal</button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"/></div>
      ) : (
        <>
          {active.length > 0 && (
            <div>
              <h2 className="section-title mb-3">Active Goals</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {active.map((g: any) => <GoalCard key={g._id} goal={g}/>)}
              </div>
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <h2 className="section-title mb-3 text-emerald-400">Completed Goals</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {completed.map((g: any) => <GoalCard key={g._id} goal={g}/>)}
              </div>
            </div>
          )}
          {goals.length === 0 && (
            <div className="text-center py-16 text-muted">
              <Target size={40} className="mx-auto mb-3 opacity-30"/>
              <p className="text-lg mb-1">No goals yet</p>
              <p className="text-sm">Set a financial goal to start tracking your progress</p>
            </div>
          )}
        </>
      )}

      {/* Add Goal Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAdd(false)}/>
          <div className="relative z-10 w-full max-w-md card p-6 animate-slide-up">
            <h2 className="text-lg font-semibold text-white mb-5">New Goal</h2>
            <form onSubmit={goalSubmit(d => createGoal.mutate(d))} className="space-y-4">
              <div>
                <label className="label">Goal Title</label>
                <input {...goalReg('title')} placeholder="e.g. Japan Trip, Emergency Fund" className="input"/>
                {goalErrors.title && <p className="text-xs text-red-400 mt-1">{goalErrors.title.message}</p>}
              </div>
              <div>
                <label className="label">Target Amount</label>
                <input {...goalReg('targetAmount')} type="number" step="0.01" placeholder="0.00" className="input font-mono"/>
                {goalErrors.targetAmount && <p className="text-xs text-red-400 mt-1">{goalErrors.targetAmount.message}</p>}
              </div>
              <div>
                <label className="label">Target Date</label>
                <input {...goalReg('targetDate')} type="date" className="input"/>
                {goalErrors.targetDate && <p className="text-xs text-red-400 mt-1">{goalErrors.targetDate.message}</p>}
              </div>
              <div>
                <label className="label">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => goalSet('color', c)}
                      className={cn('w-7 h-7 rounded-lg transition-all', selColor === c ? 'ring-2 ring-white/50 ring-offset-1 ring-offset-[#0d0d1a] scale-110' : '')}
                      style={{ background: c }}/>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={createGoal.isPending} className="btn-primary flex-1">{createGoal.isPending ? 'Creating…' : 'Create Goal'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contribute Modal */}
      {contributeFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setContributeFor(null)}/>
          <div className="relative z-10 w-full max-w-sm card p-6 animate-slide-up">
            <h2 className="text-lg font-semibold text-white mb-1">Add Contribution</h2>
            <p className="text-muted text-sm mb-5">{contributeFor.title}</p>
            <form onSubmit={contribSubmit(d => contribute.mutate({ id: contributeFor._id, data: d }))} className="space-y-4">
              <div>
                <label className="label">Amount</label>
                <input {...contribReg('amount')} type="number" step="0.01" placeholder="0.00" className="input font-mono"/>
                {contribErrors.amount && <p className="text-xs text-red-400 mt-1">{contribErrors.amount.message}</p>}
              </div>
              <div>
                <label className="label">Notes (optional)</label>
                <input {...contribReg('notes')} placeholder="Add a note…" className="input"/>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setContributeFor(null)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={contribute.isPending} className="btn-primary flex-1">{contribute.isPending ? 'Saving…' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
