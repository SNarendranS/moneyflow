import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsAPI, accountsAPI, categoriesAPI } from '../services/api';
import {
  formatCurrency,
  formatDate,
  getTransactionColor,
  getTransactionBg,
  getTransactionSign,
  cn,
} from '../utils';
import { useAuth } from '../store/auth';
import {
  Trash2,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  Pencil,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  PiggyBank,
  Search,
  X,
  Calendar,
  Wallet,
  Tag as TagIcon,
  SlidersHorizontal,
  ArrowUpDown,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
} from 'date-fns';
import toast from 'react-hot-toast';
import QuickAddModal from '../components/transactions/QuickAddModal';
import { Account, Category } from '../types';

const TYPE_FILTERS = [
  { value: 'all', label: 'All Types' },
  { value: 'expense', label: 'Expenses' },
  { value: 'income', label: 'Income' },
  { value: 'investment', label: 'Investments' },
  { value: 'transfer', label: 'Transfers' },
];

const DATE_PRESETS = [
  { value: 'all', label: 'All Dates' },
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
];

const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Date: Newest first', sortBy: 'date', sortOrder: 'desc' as const },
  { value: 'date_asc', label: 'Date: Oldest first', sortBy: 'date', sortOrder: 'asc' as const },
  { value: 'amount_desc', label: 'Amount: High to Low', sortBy: 'amount', sortOrder: 'desc' as const },
  { value: 'amount_asc', label: 'Amount: Low to High', sortBy: 'amount', sortOrder: 'asc' as const },
];

export default function TransactionsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const currency = user?.currency || 'INR';

  // ── FILTER STATES ──────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [datePreset, setDatePreset] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [sortKey, setSortKey] = useState('date_desc'); // default sort is by transaction date descending
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Search with debounce
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Modals
  const [showAdd, setShowAdd] = useState(false);
  const [editTx, setEditTx] = useState<any>(null);

  // Debounce search input by 350ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const isDebouncing = searchInput.trim() !== debouncedSearch.trim();

  // ── DYNAMIC BACKEND ACCOUNTS & CATEGORIES ───────────────────────
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsAPI.list().then((r) => r.data.data),
  });
  const accounts: Account[] = accountsData || [];

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.list().then((r) => r.data.data),
  });
  const categories: Category[] = categoriesData || [];

  // ── COMPUTE DATE RANGE PARAMS ──────────────────────────────────
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    switch (datePreset) {
      case 'today': {
        const d = format(now, 'yyyy-MM-dd');
        return { startDate: d, endDate: d };
      }
      case 'this_week': {
        return {
          startDate: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
          endDate: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        };
      }
      case 'this_month': {
        return {
          startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
        };
      }
      case 'last_month': {
        const prev = subMonths(now, 1);
        return {
          startDate: format(startOfMonth(prev), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(prev), 'yyyy-MM-dd'),
        };
      }
      case 'this_year': {
        return {
          startDate: format(startOfYear(now), 'yyyy-MM-dd'),
          endDate: format(endOfYear(now), 'yyyy-MM-dd'),
        };
      }
      case 'custom': {
        return {
          startDate: customStartDate || undefined,
          endDate: customEndDate || undefined,
        };
      }
      default:
        return { startDate: undefined, endDate: undefined };
    }
  }, [datePreset, customStartDate, customEndDate]);

  // Derive sort options
  const selectedSort = SORT_OPTIONS.find((s) => s.value === sortKey) || SORT_OPTIONS[0];

  // ── FETCH TRANSACTIONS FROM BACKEND ────────────────────────────
  const queryParams = {
    page,
    limit: 20,
    sortBy: selectedSort.sortBy,
    sortOrder: selectedSort.sortOrder,
    ...(typeFilter !== 'all' ? { type: typeFilter } : {}),
    ...(accountFilter !== 'all' ? { accountId: accountFilter } : {}),
    ...(categoryFilter !== 'all' ? { categoryId: categoryFilter } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    ...(minAmount ? { minAmount } : {}),
    ...(maxAmount ? { maxAmount } : {}),
    ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['transactions', queryParams],
    queryFn: () => transactionsAPI.list(queryParams).then((r) => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => transactionsAPI.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Transaction deleted');
    },
    onError: () => toast.error('Failed to delete transaction'),
  });

  const transactions = data?.data || [];
  const pagination = data?.pagination;

  // Active filter count (excluding default values)
  const activeFiltersCount =
    (typeFilter !== 'all' ? 1 : 0) +
    (accountFilter !== 'all' ? 1 : 0) +
    (categoryFilter !== 'all' ? 1 : 0) +
    (datePreset !== 'all' ? 1 : 0) +
    (minAmount ? 1 : 0) +
    (maxAmount ? 1 : 0) +
    (debouncedSearch.trim() ? 1 : 0);

  const resetAllFilters = () => {
    setTypeFilter('all');
    setAccountFilter('all');
    setCategoryFilter('all');
    setDatePreset('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setMinAmount('');
    setMaxAmount('');
    setSearchInput('');
    setDebouncedSearch('');
    setSortKey('date_desc');
    setPage(1);
  };

  // Helper label for the selected account
  const selectedAccountName =
    accountFilter !== 'all'
      ? accounts.find((a) => a._id === accountFilter)?.name || 'Selected Account'
      : null;

  // Helper label for the selected category
  const selectedCategoryName =
    categoryFilter !== 'all'
      ? categories.find((c) => c._id === categoryFilter)?.name || 'Selected Category'
      : null;

  return (
    <div className="space-y-5">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Transactions</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {pagination?.total ?? 0} transaction{pagination?.total === 1 ? '' : 's'} recorded
            {activeFiltersCount > 0 && ' (filtered)'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <button
              onClick={resetAllFilters}
              className="btn-ghost flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
              title="Reset all filters"
            >
              <RotateCcw size={14} />
              <span className="hidden sm:inline">Reset Filters</span>
            </button>
          )}
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* ── Search & Filter Controls Bar ──────────────────────────── */}
      <div className="card p-3.5 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
          {/* Search Input with Debounce */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              {isDebouncing || isFetching ? (
                <Loader2 size={16} className="animate-spin text-brand-400" />
              ) : (
                <Search size={16} />
              )}
            </div>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by caption, note, category, account, type, amount, date…"
              className="input pl-10 pr-9 py-2 text-sm bg-white/[0.03] border-white/10 placeholder-slate-500 rounded-xl"
            />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput('');
                  setDebouncedSearch('');
                  setPage(1);
                }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white transition-colors"
                title="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Dynamic Account Filter (Backend driven) */}
            <div className="relative">
              <select
                value={accountFilter}
                onChange={(e) => {
                  setAccountFilter(e.target.value);
                  setPage(1);
                }}
                className={cn(
                  'input py-2 pl-3 pr-8 text-xs rounded-xl transition-all cursor-pointer border',
                  accountFilter !== 'all'
                    ? 'bg-brand-500/15 border-brand-500/40 text-brand-300 font-medium'
                    : 'bg-white/[0.04] border-white/10 text-slate-300'
                )}
                aria-label="Filter by Account"
              >
                <option value="all">All Accounts ({accounts.length})</option>
                {accounts.map((acc) => (
                  <option key={acc._id} value={acc._id}>
                    {acc.name} ({acc.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Preset Filter */}
            <div className="relative">
              <select
                value={datePreset}
                onChange={(e) => {
                  setDatePreset(e.target.value);
                  setPage(1);
                }}
                className={cn(
                  'input py-2 pl-3 pr-8 text-xs rounded-xl transition-all cursor-pointer border',
                  datePreset !== 'all'
                    ? 'bg-brand-500/15 border-brand-500/40 text-brand-300 font-medium'
                    : 'bg-white/[0.04] border-white/10 text-slate-300'
                )}
                aria-label="Filter by Date Range"
              >
                {DATE_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Order Selector (Date wise by default) */}
            <div className="relative">
              <select
                value={sortKey}
                onChange={(e) => {
                  setSortKey(e.target.value);
                  setPage(1);
                }}
                className="input py-2 pl-3 pr-8 text-xs rounded-xl bg-white/[0.04] border-white/10 text-slate-300 cursor-pointer"
                aria-label="Sort order"
              >
                {SORT_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* More Filters Toggle Button */}
            <button
              onClick={() => setShowFiltersPanel((prev) => !prev)}
              className={cn(
                'btn-secondary py-2 px-3 text-xs flex items-center gap-1.5 rounded-xl border transition-all',
                showFiltersPanel || categoryFilter !== 'all' || minAmount || maxAmount || datePreset === 'custom'
                  ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                  : 'bg-white/[0.04] text-slate-300 border-white/10'
              )}
              title="More filter options"
            >
              <SlidersHorizontal size={14} />
              <span>More</span>
              {(categoryFilter !== 'all' || minAmount || maxAmount) && (
                <span className="w-2 h-2 rounded-full bg-brand-400"></span>
              )}
            </button>
          </div>
        </div>

        {/* ── Expanded Advanced Filters Panel ───────────────────────── */}
        {showFiltersPanel && (
          <div className="pt-3 border-t border-white/[0.08] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Category Filter */}
            <div>
              <label className="label text-[11px] text-slate-400 mb-1 flex items-center gap-1">
                <TagIcon size={12} /> Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                className="input py-1.5 px-3 text-xs bg-[#0d0f18] border-white/10 rounded-xl"
              >
                <option value="all">All Categories ({categories.length})</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Min Amount */}
            <div>
              <label className="label text-[11px] text-slate-400 mb-1">Min Amount ({currency})</label>
              <input
                type="number"
                placeholder="0"
                value={minAmount}
                onChange={(e) => {
                  setMinAmount(e.target.value);
                  setPage(1);
                }}
                className="input py-1.5 px-3 text-xs bg-[#0d0f18] border-white/10 rounded-xl"
              />
            </div>

            {/* Max Amount */}
            <div>
              <label className="label text-[11px] text-slate-400 mb-1">Max Amount ({currency})</label>
              <input
                type="number"
                placeholder="No limit"
                value={maxAmount}
                onChange={(e) => {
                  setMaxAmount(e.target.value);
                  setPage(1);
                }}
                className="input py-1.5 px-3 text-xs bg-[#0d0f18] border-white/10 rounded-xl"
              />
            </div>

            {/* Reset inside drawer */}
            <div className="flex items-end">
              <button
                onClick={resetAllFilters}
                className="btn-secondary w-full py-1.5 text-xs flex items-center justify-center gap-1.5 rounded-xl border-white/10 hover:border-rose-500/30 hover:text-rose-300"
              >
                <RotateCcw size={13} />
                <span>Reset All Filters</span>
              </button>
            </div>

            {/* Custom Date Pickers (if custom date range is active) */}
            {datePreset === 'custom' && (
              <div className="sm:col-span-2 md:col-span-4 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/[0.05]">
                <div>
                  <label className="label text-[11px] text-slate-400 mb-1 flex items-center gap-1">
                    <Calendar size={12} /> Start Date
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => {
                      setCustomStartDate(e.target.value);
                      setPage(1);
                    }}
                    className="input py-1.5 px-3 text-xs bg-[#0d0f18] border-white/10 rounded-xl"
                  />
                </div>
                <div>
                  <label className="label text-[11px] text-slate-400 mb-1 flex items-center gap-1">
                    <Calendar size={12} /> End Date
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => {
                      setCustomEndDate(e.target.value);
                      setPage(1);
                    }}
                    className="input py-1.5 px-3 text-xs bg-[#0d0f18] border-white/10 rounded-xl"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Type Filter Pills ───────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
          <Filter size={14} className="text-slate-500 mr-1 flex-shrink-0" />
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setTypeFilter(f.value);
                setPage(1);
              }}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-medium transition-all border whitespace-nowrap flex-shrink-0',
                typeFilter === f.value
                  ? 'bg-brand-500/20 text-brand-300 border-brand-500/40 shadow-glow'
                  : 'bg-white/[0.03] text-slate-400 border-white/[0.08] hover:text-white hover:bg-white/[0.06]'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* ── Active Filter Badges ───────────────────────────────────── */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-white/[0.06] text-xs">
            <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider mr-1">
              Active:
            </span>

            {debouncedSearch.trim() && (
              <span className="badge bg-brand-500/10 text-brand-300 border-brand-500/30 gap-1.5">
                <Search size={11} /> "{debouncedSearch}"
                <button
                  onClick={() => {
                    setSearchInput('');
                    setDebouncedSearch('');
                    setPage(1);
                  }}
                  className="hover:text-white"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {selectedAccountName && (
              <span className="badge bg-sky-500/10 text-sky-300 border-sky-500/30 gap-1.5">
                <Wallet size={11} /> Account: {selectedAccountName}
                <button
                  onClick={() => {
                    setAccountFilter('all');
                    setPage(1);
                  }}
                  className="hover:text-white"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {datePreset !== 'all' && (
              <span className="badge bg-indigo-500/10 text-indigo-300 border-indigo-500/30 gap-1.5">
                <Calendar size={11} /> {DATE_PRESETS.find((p) => p.value === datePreset)?.label}
                <button
                  onClick={() => {
                    setDatePreset('all');
                    setCustomStartDate('');
                    setCustomEndDate('');
                    setPage(1);
                  }}
                  className="hover:text-white"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {typeFilter !== 'all' && (
              <span className="badge bg-violet-500/10 text-violet-300 border-violet-500/30 gap-1.5">
                Type: {TYPE_FILTERS.find((t) => t.value === typeFilter)?.label}
                <button
                  onClick={() => {
                    setTypeFilter('all');
                    setPage(1);
                  }}
                  className="hover:text-white"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {selectedCategoryName && (
              <span className="badge bg-emerald-500/10 text-emerald-300 border-emerald-500/30 gap-1.5">
                <TagIcon size={11} /> Category: {selectedCategoryName}
                <button
                  onClick={() => {
                    setCategoryFilter('all');
                    setPage(1);
                  }}
                  className="hover:text-white"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {minAmount && (
              <span className="badge bg-amber-500/10 text-amber-300 border-amber-500/30 gap-1.5">
                Min: {formatCurrency(Number(minAmount), currency)}
                <button
                  onClick={() => {
                    setMinAmount('');
                    setPage(1);
                  }}
                  className="hover:text-white"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {maxAmount && (
              <span className="badge bg-amber-500/10 text-amber-300 border-amber-500/30 gap-1.5">
                Max: {formatCurrency(Number(maxAmount), currency)}
                <button
                  onClick={() => {
                    setMaxAmount('');
                    setPage(1);
                  }}
                  className="hover:text-white"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            <button
              onClick={resetAllFilters}
              className="text-[11px] text-slate-400 hover:text-rose-300 ml-1 underline underline-offset-2"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── Transactions List Card ─────────────────────────────────── */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-2">
            <Loader2 size={24} className="animate-spin text-brand-400" />
            <span className="text-sm">Loading transactions…</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16 px-4">
            <p className="text-slate-300 font-medium mb-1">
              {activeFiltersCount > 0 ? 'No matching transactions found' : 'No transactions recorded yet'}
            </p>
            <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
              {activeFiltersCount > 0
                ? 'Try adjusting your search terms, account, date, or other filter criteria.'
                : 'Start tracking your cash flow by recording expenses, earnings, and investments.'}
            </p>
            {activeFiltersCount > 0 ? (
              <button
                onClick={resetAllFilters}
                className="btn-secondary text-xs inline-flex items-center gap-1.5"
              >
                <RotateCcw size={13} /> Reset Filters
              </button>
            ) : (
              <button
                onClick={() => setShowAdd(true)}
                className="btn-primary text-xs inline-flex items-center gap-1.5"
              >
                <Plus size={14} /> Add Transaction
              </button>
            )}
          </div>
        ) : (
          <div className={cn('divide-y divide-white/[0.06] transition-opacity', isFetching && 'opacity-70')}>
            {transactions.map((tx: any) => (
              <div
                key={tx._id}
                className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-white/[0.03] transition-colors group"
              >
                {/* Type Icon Badge */}
                <div
                  className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center text-xs font-semibold flex-shrink-0 border',
                    getTransactionBg(tx.type)
                  )}
                >
                  {tx.type === 'income' ? (
                    <TrendingUp size={15} />
                  ) : tx.type === 'expense' ? (
                    <TrendingDown size={15} />
                  ) : tx.type === 'investment' ? (
                    <PiggyBank size={15} />
                  ) : (
                    <ArrowLeftRight size={15} />
                  )}
                </div>

                {/* Description & Metadata */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white truncate">
                      {tx.type === 'expense' && (tx.categoryId?.name || 'Expense')}
                      {tx.type === 'income' && (tx.categoryId?.name || tx.incomeSource || 'Income')}
                      {tx.type === 'transfer' &&
                        (tx.toExternal
                          ? `To ${tx.toExternal}`
                          : `${tx.fromAccountId?.name || '?'} → ${tx.toAccountId?.name || '?'}`)}
                      {tx.type === 'investment' &&
                        (tx.categoryId?.name ||
                          tx.investmentName ||
                          tx.investmentType ||
                          'Investment')}
                    </span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/[0.05] text-slate-400 border border-white/[0.08]">
                      {tx.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 flex-wrap">
                    {/* Transaction Date (Prominent) */}
                    <span className="text-slate-400 font-medium">{formatDate(tx.date)}</span>

                    {/* Account Name */}
                    {tx.accountId && <span>· {tx.accountId.name}</span>}

                    {/* Category if transfer or additional details */}
                    {tx.type === 'income' && tx.categoryId && tx.incomeSource && (
                      <span className="text-emerald-400/80 truncate max-w-32">
                        · {tx.incomeSource}
                      </span>
                    )}
                    {tx.type === 'investment' && tx.categoryId && tx.investmentName && (
                      <span className="text-violet-400/80 truncate max-w-32">
                        · {tx.investmentName}
                      </span>
                    )}
                    {tx.subCategoryId && (
                      <span className="text-slate-400 truncate max-w-28">
                        · {tx.subCategoryId.name}
                      </span>
                    )}

                    {/* Caption / Notes */}
                    {tx.notes && (
                      <span className="text-slate-300 italic truncate max-w-xs">
                        · "{tx.notes}"
                      </span>
                    )}
                  </div>
                </div>

                {/* Tags */}
                {tx.tags?.length > 0 && (
                  <div className="hidden md:flex gap-1">
                    {tx.tags.slice(0, 2).map((tag: any) => (
                      <span
                        key={tag._id}
                        className="text-[11px] px-2 py-0.5 rounded-md border"
                        style={{
                          background: tag.color + '15',
                          color: tag.color,
                          borderColor: tag.color + '30',
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Amount */}
                <div className={cn('text-sm font-mono font-bold text-right flex-shrink-0', getTransactionColor(tx.type))}>
                  {getTransactionSign(tx.type)}
                  {formatCurrency(tx.amount, currency)}
                </div>

                {/* Actions */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditTx(tx)}
                    className="btn-ghost p-1.5 text-blue-400 hover:text-blue-300"
                    title="Edit transaction"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this transaction? Balance will be adjusted.')) {
                        deleteMutation.mutate(tx._id);
                      }
                    }}
                    className="btn-ghost p-1.5 text-rose-400 hover:text-rose-300"
                    title="Delete transaction"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Pagination ────────────────────────────────────────────── */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!pagination.hasPrev}
              className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.hasNext}
              className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {showAdd && <QuickAddModal onClose={() => setShowAdd(false)} />}
      {editTx && <QuickAddModal onClose={() => setEditTx(null)} editTransaction={editTx} />}
    </div>
  );
}
