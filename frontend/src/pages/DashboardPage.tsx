import { useQuery } from '@tanstack/react-query';
import { analyticsAPI, transactionsAPI, recurringAPI, lendingAPI } from '../services/api';
import { formatCurrency, formatDate, getTransactionColor, getTransactionSign } from '../utils';
import { useAuth } from '../store/auth';
import { TrendingUp, TrendingDown, ArrowLeftRight, PiggyBank, Zap, Clock, Coins } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

const StatCard = ({ label, value, icon: Icon, color, currency = 'INR' }: any) => (
  <div className="stat-card">
    <div className="flex items-start justify-between">
      <span className="text-muted">{label}</span>
      <div className={`w-8 h-8 rounded-xl ${color} flex items-center justify-center`}>
        <Icon size={16} />
      </div>
    </div>
    <div className="text-2xl font-bold text-white mt-2 font-mono">{formatCurrency(value, currency)}</div>
  </div>
);

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: dash } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => analyticsAPI.dashboard().then(r => r.data.data),
  });

  const { data: txData } = useQuery({
    queryKey: ['transactions', { limit: '5' }],
    queryFn: () => transactionsAPI.list({ limit: 5 }).then(r => r.data.data),
  });

  const { data: recurring } = useQuery({
    queryKey: ['recurring'],
    queryFn: () => recurringAPI.list().then(r => r.data.data),
  });

  const { data: insights } = useQuery({
    queryKey: ['insights'],
    queryFn: () => analyticsAPI.insights().then(r => r.data.data),
  });

  const { data: monthly } = useQuery({
    queryKey: ['analytics-monthly'],
    queryFn: () => analyticsAPI.monthly(6).then(r => r.data.data),
  });

  const { data: lendingSummary } = useQuery({
    queryKey: ['lending-summary'],
    queryFn: () => lendingAPI.summary().then(r => r.data.data),
  });

  const stats = dash?.stats || {};
  const currency = user?.currency || 'INR';

  // Build chart data from monthly analytics
  const chartData = (() => {
    if (!monthly) return [];
    const map: Record<string, any> = {};
    monthly.forEach((item: any) => {
      const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      if (!map[key]) map[key] = { month: format(new Date(item._id.year, item._id.month - 1), 'MMM'), income: 0, expense: 0 };
      map[key][item._id.type] = item.total;
    });
    return Object.values(map);
  })();

  const dueSoon = recurring?.filter((r: any) => r.status === 'overdue' || r.status === 'due_soon').slice(0, 3) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-muted mt-1">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
      </div>

      {/* Net Worth */}
      <div className="card p-5 flex items-center gap-4 border-brand-500/30">
        <div>
          <p className="text-muted text-sm">Net Worth</p>
          <p className="text-3xl font-bold text-white font-mono mt-1">{formatCurrency(dash?.netWorth || 0, currency)}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-muted text-sm">Savings Rate</p>
          <p className={`text-2xl font-bold font-mono mt-1 ${(dash?.savingsRate || 0) >= 20 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {dash?.savingsRate || 0}%
          </p>
        </div>
      </div>

      {/* Lending summary — only show if there's any pending lending/borrowing */}
      {lendingSummary && (lendingSummary.totalOwedToYou > 0 || lendingSummary.totalYouOwe > 0) && (
        <div className="card p-4 flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400 flex-shrink-0">
            <Coins size={18} />
          </div>
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Owed to you</p>
              <p className="text-sm font-mono font-semibold text-emerald-400 mt-0.5">{formatCurrency(lendingSummary.totalOwedToYou, currency)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">You owe</p>
              <p className="text-sm font-mono font-semibold text-amber-400 mt-0.5">{formatCurrency(lendingSummary.totalYouOwe, currency)}</p>
            </div>
          </div>
          <a href="/lending" className="text-xs text-brand-400 hover:text-brand-300 flex-shrink-0">View all →</a>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Income" value={stats.income || 0} icon={TrendingUp} color="bg-emerald-500/10 text-emerald-400" currency={currency} />
        <StatCard label="Expenses" value={stats.expense || 0} icon={TrendingDown} color="bg-red-500/10 text-red-400" currency={currency} />
        <StatCard label="Investments" value={stats.investment || 0} icon={PiggyBank} color="bg-purple-500/10 text-purple-400" currency={currency} />
        <StatCard label="Transfers" value={stats.transfer || 0} icon={ArrowLeftRight} color="bg-blue-500/10 text-blue-400" currency={currency} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="section-title mb-4">Income vs Expenses</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v / 1000)}k`} />
                <Tooltip
                  contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '13px' }}
                  formatter={(v: any) => formatCurrency(v, currency)}
                />
                <Area type="monotone" dataKey="income" stroke="#10b981" fill="url(#incomeGrad)" strokeWidth={2} name="Income" />
                <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="url(#expenseGrad)" strokeWidth={2} name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted">No data yet — add transactions to see your chart</div>
          )}
        </div>

        {/* Accounts */}
        <div className="card p-5">
          <h2 className="section-title mb-3">Accounts</h2>
          <div className="space-y-2">
            {(dash?.accounts || []).map((acc: any) => (
              <div key={acc._id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm" style={{ background: acc.color + '22', color: acc.color }}>
                  {acc.type === 'credit_card' ? '💳' : acc.type === 'savings' ? '🏦' : acc.type === 'cash' ? '💵' : '👛'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{acc.name}</div>
                  <div className="text-xs text-gray-500">{acc.type.replace('_', ' ')}</div>
                </div>
                <div className={`text-sm font-mono font-semibold ${acc.currentBalance >= 0 ? 'text-white' : 'text-red-400'}`}>
                  {formatCurrency(acc.currentBalance, currency)}
                </div>
              </div>
            ))}
            {!dash?.accounts?.length && <p className="text-muted text-sm text-center py-4">No accounts yet</p>}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="section-title mb-3">Recent Transactions</h2>
          <div className="space-y-1">
            {txData?.data?.map((tx: any) => (
              <div key={tx._id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                  tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' :
                  tx.type === 'expense' ? 'bg-red-500/10 text-red-400' :
                  tx.type === 'investment' ? 'bg-purple-500/10 text-purple-400' :
                  'bg-blue-500/10 text-blue-400'
                }`}>
                  {tx.type === 'income' ? '↓' : tx.type === 'expense' ? '↑' : tx.type === 'investment' ? '→' : '↕'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {tx.notes || tx.categoryId?.name || tx.incomeSource || tx.toExternal || tx.investmentName || tx.type}
                  </div>
                  <div className="text-xs text-gray-500">{formatDate(tx.date)}</div>
                </div>
                <div className={`text-sm font-mono font-semibold ${getTransactionColor(tx.type)}`}>
                  {getTransactionSign(tx.type)}{formatCurrency(tx.amount, currency)}
                </div>
              </div>
            ))}
            {!txData?.data?.length && <p className="text-muted text-sm text-center py-4">No transactions yet</p>}
          </div>
        </div>

        <div className="space-y-6">
          {/* Upcoming Bills */}
          <div className="card p-5">
            <h2 className="section-title mb-3 flex items-center gap-2">
              <Clock size={16} className="text-amber-400" />
              Upcoming
            </h2>
            <div className="space-y-2">
              {dueSoon.map((r: any) => (
                <div key={r._id} className={`p-2.5 rounded-xl ${r.status === 'overdue' ? 'bg-red-500/10 border border-red-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
                  <div className="text-sm font-medium text-white">{r.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5 flex justify-between">
                    <span>{r.status === 'overdue' ? '⚠️ Overdue' : '⏰ Due soon'}</span>
                    <span className="font-mono">{formatCurrency(r.amount, currency)}</span>
                  </div>
                </div>
              ))}
              {!dueSoon.length && <p className="text-muted text-sm text-center py-2">All clear!</p>}
            </div>
          </div>

          {/* Insights */}
          <div className="card p-5">
            <h2 className="section-title mb-3 flex items-center gap-2">
              <Zap size={16} className="text-brand-400" />
              Insights
            </h2>
            <div className="space-y-2">
              {insights?.slice(0, 3).map((insight: string, i: number) => (
                <div key={i} className="text-sm text-gray-300 bg-white/5 rounded-xl p-3 leading-relaxed">
                  {insight}
                </div>
              ))}
              {!insights?.length && <p className="text-muted text-sm text-center py-2">Add more data for insights</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Goals */}
      {dash?.goals?.length > 0 && (
        <div className="card p-5">
          <h2 className="section-title mb-4">Financial Goals</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {dash.goals.map((goal: any) => {
              const pct = Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100));
              return (
                <div key={goal._id} className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: goal.color + '33' }}>
                      <span className="text-xs">🎯</span>
                    </div>
                    <span className="text-sm font-medium text-white truncate">{goal.title}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5 mb-2">
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: goal.color }} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{formatCurrency(goal.savedAmount, currency)}</span>
                    <span>{pct}%</span>
                    <span>{formatCurrency(goal.targetAmount, currency)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
