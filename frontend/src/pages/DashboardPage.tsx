import { useQuery } from '@tanstack/react-query';
import { analyticsAPI, transactionsAPI, recurringAPI, lendingAPI } from '../services/api';
import { formatCurrency, formatDate, getTransactionColor, getTransactionSign } from '../utils';
import { useAuth } from '../store/auth';
import {
  TrendingUp, TrendingDown, ArrowLeftRight, PiggyBank,
  Sparkles, Clock, Coins, Landmark, Wallet, CreditCard,
  Smartphone, Banknote, AlertCircle, ArrowUpRight, ArrowDownRight,
  ChevronRight, Target
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const ACCOUNT_TYPE_ICONS: Record<string, any> = {
  salary: Banknote,
  savings: Landmark,
  cash: Wallet,
  wallet: Smartphone,
  credit_card: CreditCard,
};

const StatCard = ({ label, value, icon: Icon, colorClass, bgClass, currency = 'INR' }: any) => (
  <div className="card p-5 group hover:border-white/[0.14] transition-all">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      <div className={`w-9 h-9 rounded-xl ${bgClass} ${colorClass} flex items-center justify-center transition-transform group-hover:scale-105 border border-white/5`}>
        <Icon size={18} />
      </div>
    </div>
    <div className="text-2xl font-bold text-white mt-3 font-mono tracking-tight">
      {formatCurrency(value, currency)}
    </div>
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
  const savingsRate = dash?.savingsRate || 0;

  return (
    <div className="space-y-6">
      {/* Header & Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/analytics"
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <span>Detailed Analytics</span>
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      {/* Hero Net Worth & Savings Rate Card */}
      <div className="card p-6 relative overflow-hidden bg-gradient-to-br from-[#121524] via-[#10121d] to-[#0d0f18] border-brand-500/20 shadow-glow">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-300/80">Total Net Worth</span>
            <div className="text-3.5xl sm:text-4xl font-extrabold text-white font-mono mt-1 tracking-tight">
              {formatCurrency(dash?.netWorth || 0, currency)}
            </div>
            <p className="text-xs text-slate-400 mt-1">Calculated across all active accounts and credit facilities</p>
          </div>

          <div className="flex items-center gap-4 bg-white/[0.04] border border-white/[0.08] p-3.5 rounded-2xl">
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 font-medium">Monthly Savings Rate</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-2xl font-bold font-mono ${savingsRate >= 20 ? 'text-emerald-400' : savingsRate > 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {savingsRate}%
                </span>
                {savingsRate >= 20 ? (
                  <span className="inline-flex items-center text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    <TrendingUp size={12} className="mr-1" /> Optimal
                  </span>
                ) : (
                  <span className="inline-flex items-center text-xs font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                    <TrendingDown size={12} className="mr-1" /> Low
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lending Summary Banner */}
      {lendingSummary && (lendingSummary.totalOwedToYou > 0 || lendingSummary.totalYouOwe > 0) && (
        <div className="card p-4 flex items-center gap-4 bg-[#111322] border-brand-500/20">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 flex-shrink-0">
            <Coins size={18} />
          </div>
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-400">Owed to you</p>
              <p className="text-sm font-mono font-bold text-emerald-400 mt-0.5">
                {formatCurrency(lendingSummary.totalOwedToYou, currency)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">You owe</p>
              <p className="text-sm font-mono font-bold text-amber-400 mt-0.5">
                {formatCurrency(lendingSummary.totalYouOwe, currency)}
              </p>
            </div>
          </div>
          <Link to="/lending" className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1 flex-shrink-0">
            <span>Details</span>
            <ChevronRight size={14} />
          </Link>
        </div>
      )}

      {/* 4 Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Income"
          value={stats.income || 0}
          icon={ArrowUpRight}
          colorClass="text-emerald-400"
          bgClass="bg-emerald-500/10"
          currency={currency}
        />
        <StatCard
          label="Expenses"
          value={stats.expense || 0}
          icon={ArrowDownRight}
          colorClass="text-rose-400"
          bgClass="bg-rose-500/10"
          currency={currency}
        />
        <StatCard
          label="Investments"
          value={stats.investment || 0}
          icon={PiggyBank}
          colorClass="text-violet-400"
          bgClass="bg-violet-500/10"
          currency={currency}
        />
        <StatCard
          label="Transfers"
          value={stats.transfer || 0}
          icon={ArrowLeftRight}
          colorClass="text-sky-400"
          bgClass="bg-sky-500/10"
          currency={currency}
        />
      </div>

      {/* Chart & Accounts Section */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Income vs Expenses AreaChart */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Income vs Expenses Trend</h2>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Income
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Expense
              </span>
            </div>
          </div>

          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v / 1000)}k`} />
                <Tooltip
                  contentStyle={{
                    background: '#121422',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    fontSize: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)'
                  }}
                  formatter={(v: any) => formatCurrency(v, currency)}
                />
                <Area type="monotone" dataKey="income" stroke="#10b981" fill="url(#incomeGrad)" strokeWidth={2.5} name="Income" />
                <Area type="monotone" dataKey="expense" stroke="#f43f5e" fill="url(#expenseGrad)" strokeWidth={2.5} name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-500 text-sm">
              No transaction history recorded yet
            </div>
          )}
        </div>

        {/* Accounts List */}
        <div className="card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title">Accounts</h2>
              <Link to="/accounts" className="text-xs text-brand-400 hover:text-brand-300 font-medium">View all</Link>
            </div>
            <div className="space-y-2">
              {(dash?.accounts || []).slice(0, 4).map((acc: any) => {
                const Icon = ACCOUNT_TYPE_ICONS[acc.type] || Wallet;
                return (
                  <div key={acc._id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.04] transition-colors border border-transparent hover:border-white/[0.06]">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: acc.color + '18', color: acc.color }}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{acc.name}</div>
                      <div className="text-[11px] text-slate-500 capitalize">{acc.type.replace('_', ' ')}</div>
                    </div>
                    <div className={`text-sm font-mono font-semibold ${acc.currentBalance >= 0 ? 'text-white' : 'text-rose-400'}`}>
                      {formatCurrency(acc.currentBalance, currency)}
                    </div>
                  </div>
                );
              })}
              {!dash?.accounts?.length && (
                <p className="text-slate-500 text-sm text-center py-6">No accounts added yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transactions & Insights / Upcoming */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Recent Transactions</h2>
            <Link to="/transactions" className="text-xs text-brand-400 hover:text-brand-300 font-medium">See all</Link>
          </div>
          <div className="space-y-2">
            {txData?.data?.map((tx: any) => (
              <div key={tx._id} className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-white/[0.04] transition-colors border border-transparent hover:border-white/[0.06]">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                  tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  tx.type === 'expense' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                  tx.type === 'investment' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' :
                  'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                }`}>
                  {tx.type === 'income' ? <ArrowUpRight size={15} /> :
                   tx.type === 'expense' ? <ArrowDownRight size={15} /> :
                   tx.type === 'investment' ? <PiggyBank size={15} /> :
                   <ArrowLeftRight size={15} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {tx.notes || tx.categoryId?.name || tx.incomeSource || tx.toExternal || tx.investmentName || tx.type}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {formatDate(tx.date)} {tx.accountId?.name && `· ${tx.accountId.name}`}
                  </div>
                </div>
                <div className={`text-sm font-mono font-semibold ${getTransactionColor(tx.type)}`}>
                  {getTransactionSign(tx.type)}{formatCurrency(tx.amount, currency)}
                </div>
              </div>
            ))}
            {!txData?.data?.length && (
              <p className="text-slate-500 text-sm text-center py-6">No recent transactions</p>
            )}
          </div>
        </div>

        {/* Sidebar Widgets: Upcoming & Insights */}
        <div className="space-y-6">
          {/* Upcoming Bills */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title flex items-center gap-2">
                <Clock size={16} className="text-amber-400" />
                <span>Upcoming Due</span>
              </h2>
              <Link to="/recurring" className="text-xs text-brand-400 hover:text-brand-300 font-medium">Manage</Link>
            </div>
            <div className="space-y-2">
              {dueSoon.map((r: any) => {
                const isOverdue = r.status === 'overdue';
                return (
                  <div
                    key={r._id}
                    className={`p-3 rounded-xl border ${isOverdue ? 'bg-rose-500/10 border-rose-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white truncate">{r.title}</span>
                      <span className="text-xs font-mono font-semibold text-white">{formatCurrency(r.amount, currency)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1.5">
                      <span className={`inline-flex items-center gap-1 font-medium ${isOverdue ? 'text-rose-400' : 'text-amber-400'}`}>
                        {isOverdue ? <AlertCircle size={12} /> : <Clock size={12} />}
                        {isOverdue ? 'Overdue' : 'Due soon'}
                      </span>
                      <span className="text-slate-400">{format(new Date(r.nextDueDate), 'dd MMM')}</span>
                    </div>
                  </div>
                );
              })}
              {!dueSoon.length && <p className="text-slate-500 text-xs text-center py-3">All recurring items are on track</p>}
            </div>
          </div>

          {/* AI Insights */}
          <div className="card p-5 bg-gradient-to-b from-[#141628] to-[#10121d]">
            <h2 className="section-title mb-3 flex items-center gap-2 text-brand-300">
              <Sparkles size={16} className="text-brand-400" />
              <span>Smart Insights</span>
            </h2>
            <div className="space-y-2">
              {insights?.slice(0, 3).map((insight: string, i: number) => (
                <div key={i} className="text-xs text-slate-300 bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 leading-relaxed">
                  {insight}
                </div>
              ))}
              {!insights?.length && <p className="text-slate-500 text-xs text-center py-2">Add more activity to unlock insights</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Financial Goals Progress */}
      {dash?.goals?.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2">
              <Target size={17} className="text-brand-400" />
              <span>Financial Goals</span>
            </h2>
            <Link to="/goals" className="text-xs text-brand-400 hover:text-brand-300 font-medium">View all goals</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {dash.goals.map((goal: any) => {
              const pct = Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100));
              return (
                <div key={goal._id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.12] transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white truncate">{goal.title}</span>
                    <span className="text-xs font-mono font-semibold" style={{ color: goal.color }}>{pct}%</span>
                  </div>
                  <div className="w-full bg-white/[0.08] rounded-full h-1.5 mb-2 overflow-hidden">
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: goal.color }} />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>{formatCurrency(goal.savedAmount, currency)}</span>
                    <span>Target: {formatCurrency(goal.targetAmount, currency)}</span>
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
