import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsAPI, categoriesAPI } from '../services/api';
import { formatCurrency } from '../utils';
import { useAuth } from '../store/auth';
import { format } from 'date-fns';
import { cn } from '../utils';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, RadialBarChart, RadialBar
} from 'recharts';
import { Target, Wallet, Coins as HandCoins, TrendingUp, Layers } from 'lucide-react';

const CHART_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899','#06b6d4','#f97316','#84cc16'];

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
      const key = `${item._id.year}-${String(item._id.month).padStart(2,'0')}`;
      if (!map[key]) map[key] = { month: format(new Date(item._id.year, item._id.month - 1), 'MMM yy'), income: 0, expense: 0, investment: 0 };
      map[key][item._id.type] = item.total;
    });
    return Object.values(map);
  })();

  const savingsChart = (() => {
    if (!savingsData) return [];
    const map: Record<string, any> = {};
    savingsData.forEach((item: any) => {
      const key = `${item._id.year}-${String(item._id.month).padStart(2,'0')}`;
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

  const tooltipStyle = { background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '13px', color: '#f3f4f6' };
  const tooltipItemStyle = { color: '#f3f4f6' };
  const tooltipLabelStyle = { color: '#f3f4f6', fontWeight: 600, marginBottom: 4 };
  // Category tooltip kept visually distinct per your earlier request — different color scheme for that one chart
  const catTooltipStyle = { background: '#0f172a', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '12px', fontSize: '13px', color: '#e0e7ff' };
  const catTooltipItemStyle = { color: '#c7d2fe' };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-muted mt-0.5">Complete financial insights and trends</p>
      </div>

      {/* Insights */}
      {insights?.length > 0 && (
        <div className="card p-5">
          <h2 className="section-title mb-3">💡 Insights</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {insights.map((insight: string, i: number) => (
              <div key={i} className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-3 text-sm text-gray-300 leading-relaxed">
                {insight}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Income vs Expenses */}
      <div className="card p-5">
        <h2 className="section-title mb-4">Income vs Expenses (6 months)</h2>
        {monthlyChart.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyChart} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v/1000)}k`}/>
              <Tooltip contentStyle={tooltipStyle}  formatter={(v: any) => formatCurrency(v, currency)}/>
              <Legend wrapperStyle={{ fontSize: '13px', color: '#9ca3af' }}/>
              <Bar dataKey="income" name="Income" fill="#10b981" radius={[4,4,0,0]}/>
              <Bar dataKey="expense" name="Expenses" fill="#ef4444" radius={[4,4,0,0]}/>
              <Bar dataKey="investment" name="Investment" fill="#8b5cf6" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        ) : <div className="h-[260px] flex items-center justify-center text-muted">No data yet</div>}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="card p-5">
          <h2 className="section-title mb-4">Spending by Category</h2>
          {catData.length > 0 ? (
            <div className="flex gap-4">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={catData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2} dataKey="value">
                    {catData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]}/>
                    ))}
                  </Pie>
                  <Tooltip contentStyle={catTooltipStyle} itemStyle={catTooltipItemStyle} formatter={(v: any) => formatCurrency(v, currency)}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2 overflow-y-auto max-h-[200px] pr-1">
                {catData.map((cat: any, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cat.color }}/>
                    <span className="text-sm text-gray-300 flex-1 truncate">{cat.name}</span>
                    <span className="text-xs text-gray-500 font-mono">{Math.round((cat.value / totalExpense) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="h-[200px] flex items-center justify-center text-muted">No expense data</div>}
        </div>

        {/* Savings Trend */}
        <div className="card p-5">
          <h2 className="section-title mb-4">Savings Rate Trend</h2>
          {savingsChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={savingsChart} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} unit="%"/>
                <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} formatter={(v: any) => `${v}%`}/>
                <Area type="monotone" dataKey="rate" name="Savings Rate" stroke="#6366f1" fill="url(#savingsGrad)" strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="h-[200px] flex items-center justify-center text-muted">No data yet</div>}
        </div>
      </div>

      {/* Subcategory Drill-down */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="section-title flex items-center gap-2"><Layers size={18} className="text-brand-400"/> Spending by Subcategory</h2>
          <select
            value={subcatCategoryFilter}
            onChange={e => setSubcatCategoryFilter(e.target.value)}
            className="input py-1.5 text-sm w-auto"
          >
            <option value="">All categories</option>
            {categories.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
        {subcatData.length > 0 ? (
          <div className="space-y-2.5">
            {subcatData.map((s: any, i: number) => {
              const pct = totalSubcatExpense > 0 ? Math.round((s.value / totalSubcatExpense) * 100) : 0;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-300">
                      {s.name} {s.categoryName && <span className="text-gray-500 text-xs">· {s.categoryName}</span>}
                    </span>
                    <span className="text-sm font-mono text-white">{formatCurrency(s.value, currency)}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: s.color }}/>
                  </div>
                </div>
              );
            })}
          </div>
        ) : <div className="text-center py-10 text-muted">No subcategory data for this period</div>}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Goals Progress */}
        <div className="card p-5">
          <h2 className="section-title mb-4 flex items-center gap-2"><Target size={18} className="text-emerald-400"/> Goals Progress</h2>
          {goalsData?.goalDetails?.length > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-white font-mono">{goalsData.activeCount}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Active</div>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-emerald-400 font-mono">{goalsData.completedCount}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Completed</div>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-brand-400 font-mono">{goalsData.overallProgress}%</div>
                  <div className="text-xs text-gray-500 mt-0.5">Overall</div>
                </div>
              </div>
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {goalsData.goalDetails.map((g: any) => (
                  <div key={g._id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-300 truncate flex-1">{g.title}</span>
                      <span className={cn('text-xs font-mono ml-2', g.isCompleted ? 'text-emerald-400' : g.daysLeft < 7 ? 'text-amber-400' : 'text-gray-500')}>
                        {g.isCompleted ? '✓ Done' : `${g.daysLeft}d left`}
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, g.progress)}%`, background: g.isCompleted ? '#10b981' : g.color }}/>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : <div className="text-center py-10 text-muted">No goals set yet</div>}
        </div>

        {/* Investment Trend */}
        <div className="card p-5">
          <h2 className="section-title mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-purple-400"/> Investment Trend</h2>
          {investmentChart.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={investmentChart} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="investGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v/1000)}k`}/>
                  <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} formatter={(v: any) => formatCurrency(v, currency)}/>
                  <Area type="monotone" dataKey="total" name="Invested" stroke="#8b5cf6" fill="url(#investGrad)" strokeWidth={2}/>
                </AreaChart>
              </ResponsiveContainer>
              <div className="mt-4 pt-4 border-t border-white/5">
                <div className="text-xs text-gray-500 mb-2">By Investment Type</div>
                <div className="space-y-1.5">
                  {investmentData.byType.map((t: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-300 capitalize">{(t._id || 'other').replace('_', ' ')}</span>
                      <span className="font-mono text-white">{formatCurrency(t.total, currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : <div className="h-[200px] flex items-center justify-center text-muted">No investments yet</div>}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Account Distribution */}
        <div className="card p-5">
          <h2 className="section-title mb-4 flex items-center gap-2"><Wallet size={18} className="text-blue-400"/> Account Distribution</h2>
          {accountData?.accounts?.length > 0 ? (
            <>
              <div className="flex gap-4">
                <ResponsiveContainer width="45%" height={180}>
                  <PieChart>
                    <Pie
                      data={accountData.accounts.filter((a: any) => a.currentBalance > 0)}
                      cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="currentBalance"
                    >
                      {accountData.accounts.map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]}/>
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} formatter={(v: any) => formatCurrency(v, currency)}/>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {accountData.accounts.map((a: any, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: a.color }}/>
                      <span className="text-sm text-gray-300 flex-1 truncate">{a.name}</span>
                      <span className="text-xs text-gray-500 font-mono">{a.percentOfTotal}%</span>
                    </div>
                  ))}
                </div>
              </div>
              {accountData.totalLocked > 0 && (
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-sm">
                  <span className="text-gray-400">🔒 Locked for goals</span>
                  <span className="font-mono text-brand-400">{formatCurrency(accountData.totalLocked, currency)}</span>
                </div>
              )}
            </>
          ) : <div className="h-[180px] flex items-center justify-center text-muted">No accounts yet</div>}
        </div>

        {/* Lending Breakdown */}
        <div className="card p-5">
          <h2 className="section-title mb-4 flex items-center gap-2"><HandCoins size={18} className="text-amber-400"/> Lending Breakdown</h2>
          {lendingData?.byPerson?.length > 0 ? (
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {lendingData.byPerson.map((l: any, i: number) => {
                const remaining = l.totalAmount - l.totalSettled;
                const isLent = l._id.direction === 'lent';
                return (
                  <div key={i} className="flex items-center justify-between bg-white/5 rounded-xl p-2.5">
                    <div>
                      <div className="text-sm text-white">{l._id.personName}</div>
                      <div className="text-xs text-gray-500">{isLent ? 'Lent' : 'Borrowed'} · {l.count} {l.count === 1 ? 'entry' : 'entries'}</div>
                    </div>
                    <div className="text-right">
                      <div className={cn('text-sm font-mono', isLent ? 'text-emerald-400' : 'text-amber-400')}>
                        {formatCurrency(remaining, currency)}
                      </div>
                      <div className="text-xs text-gray-500">of {formatCurrency(l.totalAmount, currency)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <div className="h-[180px] flex items-center justify-center text-muted">No lending records yet</div>}
        </div>
      </div>

      {/* Family Support */}
      {familyData?.length > 0 && (
        <div className="card p-5">
          <h2 className="section-title mb-4">Family Support Transfers (This Year)</h2>
          <div className="space-y-3">
            {familyData.map((item: any, i: number) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-sm font-bold flex-shrink-0">
                  {item._id[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-white">{item._id}</span>
                    <span className="text-sm font-mono text-white">{formatCurrency(item.totalYearly, currency)}</span>
                  </div>
                  <div className="text-xs text-gray-500">{item.count} transfers this year</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
