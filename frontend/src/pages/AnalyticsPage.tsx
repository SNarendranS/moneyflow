import { useQuery } from '@tanstack/react-query';
import { analyticsAPI } from '../services/api';
import { formatCurrency } from '../utils';
import { useAuth } from '../store/auth';
import { format } from 'date-fns';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const CHART_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899','#06b6d4','#f97316','#84cc16'];

export default function AnalyticsPage() {
  const { user } = useAuth();
  const currency = user?.currency || 'INR';

  const { data: monthly } = useQuery({
    queryKey: ['analytics-monthly'],
    queryFn: () => analyticsAPI.monthly(6).then(r => r.data.data),
  });

  const { data: catBreakdown } = useQuery({
    queryKey: ['analytics-categories'],
    queryFn: () => analyticsAPI.categories().then(r => r.data.data),
  });

  const { data: savingsData } = useQuery({
    queryKey: ['analytics-savings'],
    queryFn: () => analyticsAPI.savings(6).then(r => r.data.data),
  });

  const { data: familyData } = useQuery({
    queryKey: ['analytics-family'],
    queryFn: () => analyticsAPI.family().then(r => r.data.data),
  });

  const { data: insights } = useQuery({
    queryKey: ['insights'],
    queryFn: () => analyticsAPI.insights().then(r => r.data.data),
  });

  // Build monthly chart data
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

  // Savings rate chart
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

  const catData = catBreakdown?.map((c: any) => ({
    name: c.category?.name || 'Other',
    value: c.total,
    color: c.category?.color || '#6366f1',
  })) || [];

  const totalExpense = catData.reduce((s: number, c: any) => s + c.value, 0);

  const tooltipStyle = { background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '13px' };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-muted mt-0.5">Financial insights and trends</p>
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
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(v, currency)}/>
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
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(v, currency)}/>
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
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => `${v}%`}/>
                <Area type="monotone" dataKey="rate" name="Savings Rate" stroke="#6366f1" fill="url(#savingsGrad)" strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="h-[200px] flex items-center justify-center text-muted">No data yet</div>}
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
