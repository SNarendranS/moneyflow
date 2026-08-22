import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsAPI, categoriesAPI } from '../services/api';
import { formatCurrency } from '../utils';
import { useAuth } from '../store/auth';
import { format } from 'date-fns';
import { cn } from '../utils';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Target, Wallet, Coins as HandCoins, TrendingUp, Layers, Sparkles, Lock, CheckCircle2, Heart } from 'lucide-react';

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16'];

export default function AnalyticsPage() {
  const { user } = useAuth();
  const currency = user?.currency || 'INR';
  const [subcatCategoryFilter, setSubcatCategoryFilter] = useState('');

  const { data: monthly } = useQuery({
    queryKey: ['analytics-monthly'],
    queryFn: () => analyticsAPI.monthly(6).then(r => r.data.data),
  });

  const { data: catBreakdown } = useQuery({
    queryKey: ['analytics-categories'],
    queryFn: () => analyticsAPI.categories().then(r => r.data.data),
  });

  const { data: subcatBreakdown } = useQuery({
    queryKey: ['analytics-subcategories', subcatCategoryFilter],
    queryFn: () => analyticsAPI.subcategories(subcatCategoryFilter ? { categoryId: subcatCategoryFilter } : undefined).then(r => r.data.data),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.list().then(r => r.data.data),
  });

  const { data: savingsData } = useQuery({
    queryKey: ['analytics-savings'],
    queryFn: () => analyticsAPI.savings(6).then(r => r.data.data),
  });

  const { data: familyData } = useQuery({
    queryKey: ['analytics-family'],
    queryFn: () => analyticsAPI.family().then(r => r.data.data),
  });

  const { data: investmentData } = useQuery({
    queryKey: ['analytics-investments'],
    queryFn: () => analyticsAPI.investments(6).then(r => r.data.data),
  });

  const { data: goalsData } = useQuery({
    queryKey: ['analytics-goals'],
    queryFn: () => analyticsAPI.goals().then(r => r.data.data),
  });

  const { data: accountData } = useQuery({
    queryKey: ['analytics-accounts'],
    queryFn: () => analyticsAPI.accounts().then(r => r.data.data),
  });

  const { data: lendingData } = useQuery({
    queryKey: ['analytics-lending'],
    queryFn: () => analyticsAPI.lending().then(r => r.data.data),
  });

  const { data: insights } = useQuery({
    queryKey: ['insights'],
    queryFn: () => analyticsAPI.insights().then(r => r.data.data),
  });

  // ── Build chart datasets ──
  const monthlyChart = (() => {
    if (!monthly) return [];
    const map: Record<string, any> = {};
    monthly.forEach((item: any) => {
      const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      if (!map[key]) map[key] = { month: format(new Date(item._id.year, item._id.month - 1), 'MMM yy'), income: 0, expense: 0, investment: 0 };
      map[key][item._id.type] = item.total;
    });
    return Object.values(map);
  })();

  const savingsChart = (() => {
    if (!savingsData) return [];
    const map: Record<string, any> = {};
    savingsData.forEach((item: any) => {
      const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      if (!map[key]) map[key] = { month: format(new Date(item._id.year, item._id.month - 1), 'MMM'), income: 0, expense: 0 };
      map[key][item._id.type] = item.total;
    });
    return Object.values(map).map((m: any) => ({
      ...m,
      savings: Math.max(0, m.income - m.expense),
      rate: m.income > 0 ? Math.round(((m.income - m.expense) / m.income) * 100) : 0,
    }));
  })();

  const investmentChart = (() => {
    if (!investmentData?.monthly) return [];
    return investmentData.monthly.map((item: any) => ({
      month: format(new Date(item._id.year, item._id.month - 1), 'MMM yy'),
      total: item.total,
    }));
  })();

  const catData = catBreakdown?.map((c: any) => ({
    name: c.category?.name || 'Other',
    value: c.total,
    color: c.category?.color || '#6366f1',
  })) || [];
  const totalExpense = catData.reduce((s: number, c: any) => s + c.value, 0);

  const subcatData = subcatBreakdown?.map((s: any) => ({
    name: s.subcategory?.name || 'Other',
    categoryName: s.category?.name || '',
    value: s.total,
    color: s.category?.color || '#6366f1',
  })) || [];
  const totalSubcatExpense = subcatData.reduce((s: number, c: any) => s + c.value, 0);

  const tooltipStyle = {
    background: '#121422',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#f8fafc',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)'
  };
  const tooltipItemStyle = { color: '#f8fafc' };
  const tooltipLabelStyle = { color: '#94a3b8', fontWeight: 600, marginBottom: 4 };

  const catTooltipStyle = {
    background: '#121422',
    border: '1px solid rgba(99,102,241,0.3)',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#e0e7ff',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Analytics & Intelligence</h1>
        <p className="text-slate-400 text-sm mt-0.5">Comprehensive breakdowns, trends, and financial telemetry</p>
      </div>

      {/* Smart Insights Banner */}
      {insights?.length > 0 && (
        <div className="card p-5 bg-gradient-to-r from-[#14162a] via-[#101220] to-[#0d0f1a] border-brand-500/20 shadow-glow">
          <h2 className="section-title mb-3 flex items-center gap-2 text-brand-300">
            <Sparkles size={16} className="text-brand-400" />
            <span>AI Financial Insights</span>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {insights.map((insight: string, i: number) => (
              <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5 text-xs text-slate-300 leading-relaxed">
                {insight}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Income vs Expenses BarChart */}
      <div className="card p-6">
        <h2 className="section-title mb-4">Cashflow Overview (Last 6 Months)</h2>
        {monthlyChart.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyChart} margin={{ top: 10, right: 10, bottom: 0, left: -15 }}>
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v / 1000)}k`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(v, currency)} />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8', paddingTop: 10 }} />
              <Bar dataKey="income" name="Income" fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" name="Expenses" fill="#f43f5e" radius={[6, 6, 0, 0]} />
              <Bar dataKey="investment" name="Investment" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[260px] flex items-center justify-center text-slate-500 text-sm">No cashflow data recorded yet</div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Category Breakdown Donut */}
        <div className="card p-5">
          <h2 className="section-title mb-4">Spending by Category</h2>
          {catData.length > 0 ? (
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <ResponsiveContainer width="100%" height={200} className="max-w-[200px]">
                <PieChart>
                  <Pie data={catData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2} dataKey="value">
                    {catData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={catTooltipStyle} formatter={(v: any) => formatCurrency(v, currency)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 w-full space-y-2 overflow-y-auto max-h-[200px] pr-1">
                {catData.map((cat: any, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                    <span className="text-xs text-slate-300 flex-1 truncate">{cat.name}</span>
                    <span className="text-xs text-slate-400 font-mono">{Math.round((cat.value / totalExpense) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">No expense data available</div>
          )}
        </div>

        {/* Savings Trend */}
        <div className="card p-5">
          <h2 className="section-title mb-4">Savings Rate Trajectory</h2>
          {savingsChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={savingsChart} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} formatter={(v: any) => `${v}%`} />
                <Area type="monotone" dataKey="rate" name="Savings Rate" stroke="#6366f1" fill="url(#savingsGrad)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">No savings data available</div>
          )}
        </div>
      </div>

      {/* Subcategory Drill-down */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="section-title flex items-center gap-2">
            <Layers size={17} className="text-brand-400" />
            <span>Spending by Subcategory</span>
          </h2>
          <select
            value={subcatCategoryFilter}
            onChange={e => setSubcatCategoryFilter(e.target.value)}
            className="input py-1.5 text-xs w-auto"
          >
            <option value="">All Categories</option>
            {categories.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
        {subcatData.length > 0 ? (
          <div className="space-y-3">
            {subcatData.map((s: any, i: number) => {
              const pct = totalSubcatExpense > 0 ? Math.round((s.value / totalSubcatExpense) * 100) : 0;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5 text-xs">
                    <span className="text-slate-300 font-medium">
                      {s.name} {s.categoryName && <span className="text-slate-500 font-normal">· {s.categoryName}</span>}
                    </span>
                    <span className="font-mono text-white font-semibold">{formatCurrency(s.value, currency)}</span>
                  </div>
                  <div className="w-full bg-white/[0.08] rounded-full h-1.5 overflow-hidden">
                    <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: s.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 text-slate-500 text-xs">No subcategory data for this selection</div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Goals Progress */}
        <div className="card p-5">
          <h2 className="section-title mb-4 flex items-center gap-2">
            <Target size={17} className="text-emerald-400" />
            <span>Goals Trajectory</span>
          </h2>
          {goalsData?.goalDetails?.length > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-white font-mono">{goalsData.activeCount}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Active</div>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-emerald-400 font-mono">{goalsData.completedCount}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Completed</div>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-brand-400 font-mono">{goalsData.overallProgress}%</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Average</div>
                </div>
              </div>
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {goalsData.goalDetails.map((g: any) => (
                  <div key={g._id}>
                    <div className="flex items-center justify-between mb-1 text-xs">
                      <span className="text-slate-300 font-medium truncate flex-1">{g.title}</span>
                      <span className={cn('font-mono ml-2 font-semibold', g.isCompleted ? 'text-emerald-400' : g.daysLeft < 7 ? 'text-amber-400' : 'text-slate-400')}>
                        {g.isCompleted ? 'Completed' : `${g.daysLeft}d left`}
                      </span>
                    </div>
                    <div className="w-full bg-white/[0.08] rounded-full h-1.5 overflow-hidden">
                      <div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, g.progress)}%`, background: g.isCompleted ? '#10b981' : g.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-10 text-slate-500 text-xs">No active goals</div>
          )}
        </div>

        {/* Investment Trend */}
        <div className="card p-5">
          <h2 className="section-title mb-4 flex items-center gap-2">
            <TrendingUp size={17} className="text-purple-400" />
            <span>Investment Portfolio Trend</span>
          </h2>
          {investmentChart.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={investmentChart} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="investGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v / 1000)}k`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(v, currency)} />
                  <Area type="monotone" dataKey="total" name="Invested" stroke="#8b5cf6" fill="url(#investGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                <div className="text-xs text-slate-400 mb-2 font-medium">By Investment Instrument</div>
                <div className="space-y-1.5">
                  {investmentData.byType.map((t: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 capitalize">{(t._id || 'other').replace('_', ' ')}</span>
                      <span className="font-mono text-white font-semibold">{formatCurrency(t.total, currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-slate-500 text-xs">No investment activity yet</div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Account Distribution */}
        <div className="card p-5">
          <h2 className="section-title mb-4 flex items-center gap-2">
            <Wallet size={17} className="text-blue-400" />
            <span>Account Capital Allocation</span>
          </h2>
          {accountData?.accounts?.length > 0 ? (
            <>
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <ResponsiveContainer width="100%" height={180} className="max-w-[180px]">
                  <PieChart>
                    <Pie
                      data={accountData.accounts.filter((a: any) => a.currentBalance > 0)}
                      cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="currentBalance"
                    >
                      {accountData.accounts.map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(v, currency)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 w-full space-y-2">
                  {accountData.accounts.map((a: any, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: a.color }} />
                      <span className="text-xs text-slate-300 flex-1 truncate">{a.name}</span>
                      <span className="text-xs text-slate-400 font-mono">{a.percentOfTotal}%</span>
                    </div>
                  ))}
                </div>
              </div>
              {accountData.totalLocked > 0 && (
                <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Lock size={12} className="text-brand-400" />
                    <span>Locked in Goal Reserves</span>
                  </span>
                  <span className="font-mono text-brand-300 font-semibold">{formatCurrency(accountData.totalLocked, currency)}</span>
                </div>
              )}
            </>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-slate-500 text-xs">No active accounts</div>
          )}
        </div>

        {/* Lending Breakdown */}
        <div className="card p-5">
          <h2 className="section-title mb-4 flex items-center gap-2">
            <HandCoins size={17} className="text-amber-400" />
            <span>Lending Positions</span>
          </h2>
          {lendingData?.byPerson?.length > 0 ? (
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {lendingData.byPerson.map((l: any, i: number) => {
                const remaining = l.totalAmount - l.totalSettled;
                const isLent = l._id.direction === 'lent';
                return (
                  <div key={i} className="flex items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                    <div>
                      <div className="text-xs font-semibold text-white">{l._id.personName}</div>
                      <div className="text-[11px] text-slate-400">{isLent ? 'Lent' : 'Borrowed'} · {l.count} {l.count === 1 ? 'entry' : 'entries'}</div>
                    </div>
                    <div className="text-right">
                      <div className={cn('text-xs font-mono font-bold', isLent ? 'text-emerald-400' : 'text-amber-400')}>
                        {formatCurrency(remaining, currency)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">of {formatCurrency(l.totalAmount, currency)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-slate-500 text-xs">No active lending records</div>
          )}
        </div>
      </div>

      {/* Family Support */}
      {familyData?.length > 0 && (
        <div className="card p-5">
          <h2 className="section-title mb-4 flex items-center gap-2">
            <Heart size={16} className="text-rose-400" />
            <span>Family Support Transfers (This Year)</span>
          </h2>
          <div className="space-y-3">
            {familyData.map((item: any, i: number) => (
              <div key={i} className="flex items-center gap-3.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 text-xs font-bold flex-shrink-0">
                  {item._id[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-0.5">
                    <span className="text-sm font-medium text-white">{item._id}</span>
                    <span className="text-sm font-mono text-white font-semibold">{formatCurrency(item.totalYearly, currency)}</span>
                  </div>
                  <div className="text-xs text-slate-500">{item.count} transfers this year</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
