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
  Check,
  CalendarDays,
  IndianRupee,
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
  subDays,
} from 'date-fns';
import toast from 'react-hot-toast';
import QuickAddModal from '../components/transactions/QuickAddModal';
import { Account, Category } from '../types';

const TYPE_FILTERS = [
  { value: 'all', label: 'All', icon: Filter },
  { value: 'expense', label: 'Expenses', icon: TrendingDown },
  { value: 'income', label: 'Income', icon: TrendingUp },
  { value: 'investment', label: 'Investments', icon: PiggyBank },
  { value: 'transfer', label: 'Transfers', icon: ArrowLeftRight },
];

const DATE_PRESETS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range…' },
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

  // Modals & Sheets
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [sortModalOpen, setSortModalOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editTx, setEditTx] = useState<any>(null);

  // Temporary custom dates in modal
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');
  const [dateModalTab, setDateModalTab] = useState<'presets' | 'custom'>('presets');

  // Search with debounce
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

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

  // Helper labels
  const selectedAccount = accounts.find((a) => a._id === accountFilter);
  const selectedCategory = categories.find((c) => c._id === categoryFilter);

  const getDateLabel = () => {
    if (datePreset === 'all') return 'All Dates';
    if (datePreset === 'today') return 'Today';
    if (datePreset === 'this_week') return 'This Week';
    if (datePreset === 'this_month') return 'This Month';
    if (datePreset === 'last_month') return 'Last Month';
    if (datePreset === 'this_year') return 'This Year';
    if (datePreset === 'custom') {
      if (customStartDate && customEndDate) return `${customStartDate} → ${customEndDate}`;
      if (customStartDate) return `From ${customStartDate}`;
      if (customEndDate) return `Until ${customEndDate}`;
      return 'Custom Range';
    }
    return 'Date';
  };

  // Handle open date modal
  const openDateModal = (tab: 'presets' | 'custom' = 'presets') => {
    setTempStartDate(customStartDate);
    setTempEndDate(customEndDate);
    setDateModalTab(datePreset === 'custom' || tab === 'custom' ? 'custom' : 'presets');
    setDateModalOpen(true);
  };

  const applyCustomDates = () => {
    setCustomStartDate(tempStartDate);
    setCustomEndDate(tempEndDate);
    setDatePreset('custom');
    setPage(1);
    setDateModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Transactions</h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400 border border-white/10 font-medium">
              {pagination?.total ?? 0}
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-0.5 hidden sm:block">
            Track expenses, earnings, and transfers sorted by transaction date
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <button
              onClick={resetAllFilters}
              className="btn-ghost flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 py-1.5 px-2.5"
              title="Reset all filters"
            >
              <RotateCcw size={13} />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

          <button
            onClick={() => setShowAdd(true)}
            className="btn-primary flex items-center gap-1.5 text-xs sm:text-sm py-2 px-3 sm:px-4"
          >
            <Plus size={16} />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* ── Main Search & Quick Filter Bar ─────────────────────────── */}
      <div className="card p-3 sm:p-4 space-y-3">
        {/* Search Input Row */}
        <div className="relative">
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
            placeholder="Search note, category, account, type, amount, date…"
            className="w-full bg-[#0a0c14] border border-white/10 rounded-xl pl-10 pr-9 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
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

        {/* Quick Filter Buttons (Mobile-first, clean wrapping) */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Account Filter Trigger */}
          <button
            onClick={() => setAccountModalOpen(true)}
            className={cn(
              'h-9 px-3 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 transition-all border',
              accountFilter !== 'all'
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sm'
                : 'bg-white/[0.04] text-slate-300 border-white/10 hover:bg-white/[0.07] hover:text-white'
            )}
          >
            <Wallet size={14} className={accountFilter !== 'all' ? 'text-sky-400' : 'text-slate-400'} />
            <span className="truncate max-w-[120px] sm:max-w-[150px]">
              {selectedAccount ? selectedAccount.name : 'All Accounts'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">▼</span>
          </button>

          {/* Date Range Trigger */}
          <button
            onClick={() => openDateModal()}
            className={cn(
              'h-9 px-3 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 transition-all border',
              datePreset !== 'all'
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-sm'
                : 'bg-white/[0.04] text-slate-300 border-white/10 hover:bg-white/[0.07] hover:text-white'
            )}
          >
            <Calendar size={14} className={datePreset !== 'all' ? 'text-indigo-400' : 'text-slate-400'} />
            <span className="truncate max-w-[130px] sm:max-w-[160px]">{getDateLabel()}</span>
            <span className="text-[10px] text-slate-500 font-mono">▼</span>
          </button>

          {/* Comprehensive Filters Drawer Trigger */}
          <button
            onClick={() => setFilterModalOpen(true)}
            className={cn(
              'h-9 px-3 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 transition-all border',
              activeFiltersCount > 0
                ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                : 'bg-white/[0.04] text-slate-300 border-white/10 hover:bg-white/[0.07] hover:text-white'
            )}
          >
            <SlidersHorizontal size={14} />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] font-bold inline-flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Sort Selector Trigger */}
          <button
            onClick={() => setSortModalOpen(true)}
            className="h-9 px-3 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 bg-white/[0.04] text-slate-300 border border-white/10 hover:bg-white/[0.07] hover:text-white transition-all ml-auto"
            title="Sort transactions"
          >
            <ArrowUpDown size={14} className="text-slate-400" />
            <span className="hidden sm:inline">{selectedSort.label}</span>
            <span className="sm:hidden font-mono">Sort</span>
          </button>
        </div>

        {/* ── Type Tabs (Smooth Horizontal Scroll on Mobile) ────────── */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar border-t border-white/[0.06] pt-2.5">
          {TYPE_FILTERS.map((f) => {
            const Icon = f.icon;
            const isSelected = typeFilter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => {
                  setTypeFilter(f.value);
                  setPage(1);
                }}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-medium transition-all border whitespace-nowrap flex-shrink-0 inline-flex items-center gap-1.5',
                  isSelected
                    ? 'bg-brand-500/20 text-brand-300 border-brand-500/40 shadow-glow'
                    : 'bg-white/[0.02] text-slate-400 border-white/[0.06] hover:text-white hover:bg-white/[0.06]'
                )}
              >
                <Icon size={13} className={isSelected ? 'text-brand-400' : 'text-slate-500'} />
                <span>{f.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Active Filter Badges Strip ───────────────────────────── */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-white/[0.06] text-xs">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mr-1">
              Active:
            </span>

            {debouncedSearch.trim() && (
              <span className="badge bg-brand-500/10 text-brand-300 border-brand-500/30 gap-1.5 py-0.5">
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

            {accountFilter !== 'all' && (
              <span className="badge bg-sky-500/10 text-sky-300 border-sky-500/30 gap-1.5 py-0.5">
                <Wallet size={11} /> {selectedAccount?.name || 'Account'}
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
              <span className="badge bg-indigo-500/10 text-indigo-300 border-indigo-500/30 gap-1.5 py-0.5">
                <Calendar size={11} /> {getDateLabel()}
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
              <span className="badge bg-violet-500/10 text-violet-300 border-violet-500/30 gap-1.5 py-0.5">
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

            {categoryFilter !== 'all' && (
              <span className="badge bg-emerald-500/10 text-emerald-300 border-emerald-500/30 gap-1.5 py-0.5">
                <TagIcon size={11} /> {selectedCategory?.name || 'Category'}
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
              <span className="badge bg-amber-500/10 text-amber-300 border-amber-500/30 gap-1.5 py-0.5">
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
              <span className="badge bg-amber-500/10 text-amber-300 border-amber-500/30 gap-1.5 py-0.5">
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
              className="text-[11px] text-slate-400 hover:text-rose-300 ml-auto underline underline-offset-2"
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
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto mb-3 text-slate-500">
              <Search size={22} />
            </div>
            <p className="text-slate-200 font-semibold mb-1">
              {activeFiltersCount > 0 ? 'No matching transactions found' : 'No transactions recorded yet'}
            </p>
            <p className="text-xs text-slate-400 mb-5 max-w-sm mx-auto leading-relaxed">
              {activeFiltersCount > 0
                ? 'Try broadening your search term, changing accounts, or resetting active filters.'
                : 'Start tracking your cash flow by recording your expenses, earnings, and investments.'}
            </p>
            {activeFiltersCount > 0 ? (
              <button
                onClick={resetAllFilters}
                className="btn-secondary text-xs inline-flex items-center gap-1.5"
              >
                <RotateCcw size={13} /> Reset All Filters
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
                className="flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-white/[0.03] transition-colors group"
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
                <div className="flex-1 min-w-0 pr-1">
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
                  </div>

                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 flex-wrap">
                    {/* Transaction Date (Prominent) */}
                    <span className="text-slate-400 font-medium">{formatDate(tx.date)}</span>

                    {/* Account Name */}
                    {tx.accountId && (
                      <span className="text-slate-400 font-medium">· {tx.accountId.name}</span>
                    )}

                    {/* Notes snippet */}
                    {tx.notes && (
                      <span className="text-slate-300 italic truncate max-w-[140px] sm:max-w-xs">
                        · "{tx.notes}"
                      </span>
                    )}

                    {/* Secondary details */}
                    {tx.type === 'income' && tx.categoryId && tx.incomeSource && (
                      <span className="text-emerald-400/80 truncate max-w-32 hidden sm:inline">
                        · {tx.incomeSource}
                      </span>
                    )}
                    {tx.type === 'investment' && tx.categoryId && tx.investmentName && (
                      <span className="text-violet-400/80 truncate max-w-32 hidden sm:inline">
                        · {tx.investmentName}
                      </span>
                    )}
                    {tx.subCategoryId && (
                      <span className="text-slate-400 truncate max-w-28 hidden sm:inline">
                        · {tx.subCategoryId.name}
                      </span>
                    )}
                  </div>
                </div>

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
                    <Pencil size={14} />
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
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Pagination ────────────────────────────────────────────── */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
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

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── DATE RANGE MODAL (10/10 UX - Visible, Clear, Instant) ─── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {dateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => setDateModalOpen(false)} />
          <div className="relative z-10 w-full max-w-md bg-[#121422] border border-white/10 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 animate-slide-up max-h-[85vh] overflow-y-auto shadow-2xl shadow-black/90 ring-1 ring-white/5">
            {/* Mobile Drag Bar */}
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4 sm:hidden" />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarDays size={18} className="text-brand-400" />
                <h2 className="text-base font-semibold text-white tracking-tight">Select Date Range</h2>
              </div>
              <button
                onClick={() => setDateModalOpen(false)}
                className="btn-ghost p-1.5 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Segmented Control: Presets vs Custom Range */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#090b12] rounded-xl border border-white/10 mb-4">
              <button
                onClick={() => setDateModalTab('presets')}
                className={cn(
                  'py-1.5 text-xs font-medium rounded-lg transition-all',
                  dateModalTab === 'presets'
                    ? 'bg-brand-500/20 text-brand-300 font-semibold border border-brand-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                Quick Presets
              </button>
              <button
                onClick={() => setDateModalTab('custom')}
                className={cn(
                  'py-1.5 text-xs font-medium rounded-lg transition-all',
                  dateModalTab === 'custom'
                    ? 'bg-brand-500/20 text-brand-300 font-semibold border border-brand-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                Custom Range
              </button>
            </div>

            {/* Presets Grid */}
            {dateModalTab === 'presets' && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DATE_PRESETS.filter((p) => p.value !== 'custom').map((p) => {
                    const isSelected = datePreset === p.value;
                    return (
                      <button
                        key={p.value}
                        onClick={() => {
                          setDatePreset(p.value);
                          setPage(1);
                          setDateModalOpen(false);
                        }}
                        className={cn(
                          'p-3 rounded-xl border text-xs font-medium text-left transition-all flex items-center justify-between',
                          isSelected
                            ? 'bg-brand-500/20 text-brand-300 border-brand-500/40 font-semibold'
                            : 'bg-white/[0.03] text-slate-300 border-white/[0.08] hover:bg-white/[0.07] hover:text-white'
                        )}
                      >
                        <span>{p.label}</span>
                        {isSelected && <Check size={14} className="text-brand-400" />}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-white/[0.08]">
                  <button
                    onClick={() => setDateModalTab('custom')}
                    className="w-full btn-secondary text-xs py-2.5 flex items-center justify-center gap-2 rounded-xl text-brand-300 border-brand-500/30 hover:bg-brand-500/10"
                  >
                    <span>Or define specific Start & End dates</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Custom Range Picker */}
            {dateModalTab === 'custom' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      From (Start Date)
                    </label>
                    <input
                      type="date"
                      value={tempStartDate}
                      onChange={(e) => setTempStartDate(e.target.value)}
                      className="w-full bg-[#0a0c14] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      To (End Date)
                    </label>
                    <input
                      type="date"
                      value={tempEndDate}
                      onChange={(e) => setTempEndDate(e.target.value)}
                      className="w-full bg-[#0a0c14] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                    />
                  </div>
                </div>

                {/* Quick Shortcut Buttons for Custom Range */}
                <div>
                  <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-1.5">
                    Quick Shortcuts
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        setTempStartDate(format(subDays(now, 7), 'yyyy-MM-dd'));
                        setTempEndDate(format(now, 'yyyy-MM-dd'));
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10"
                    >
                      Last 7 days
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        setTempStartDate(format(subDays(now, 30), 'yyyy-MM-dd'));
                        setTempEndDate(format(now, 'yyyy-MM-dd'));
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10"
                    >
                      Last 30 days
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        setTempStartDate(format(subDays(now, 90), 'yyyy-MM-dd'));
                        setTempEndDate(format(now, 'yyyy-MM-dd'));
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10"
                    >
                      Last 90 days
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        setTempStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
                        setTempEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10"
                    >
                      This Month
                    </button>
                  </div>
                </div>

                {/* Apply Button */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTempStartDate('');
                      setTempEndDate('');
                      setDatePreset('all');
                      setCustomStartDate('');
                      setCustomEndDate('');
                      setPage(1);
                      setDateModalOpen(false);
                    }}
                    className="btn-secondary flex-1 text-xs py-2.5"
                  >
                    Clear Dates
                  </button>
                  <button
                    type="button"
                    onClick={applyCustomDates}
                    className="btn-primary flex-1 text-xs py-2.5 shadow-glow"
                  >
                    Apply Custom Range
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── ACCOUNT SELECTOR MODAL / BOTTOM SHEET ─────────────────── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {accountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => setAccountModalOpen(false)} />
          <div className="relative z-10 w-full max-w-md bg-[#121422] border border-white/10 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 animate-slide-up max-h-[85vh] overflow-y-auto shadow-2xl shadow-black/90 ring-1 ring-white/5">
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4 sm:hidden" />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet size={18} className="text-sky-400" />
                <h2 className="text-base font-semibold text-white tracking-tight">Filter by Account</h2>
              </div>
              <button
                onClick={() => setAccountModalOpen(false)}
                className="btn-ghost p-1.5 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-3">
              Dynamically retrieved from your registered accounts
            </p>

            <div className="space-y-2">
              {/* All Accounts Option */}
              <button
                onClick={() => {
                  setAccountFilter('all');
                  setPage(1);
                  setAccountModalOpen(false);
                }}
                className={cn(
                  'w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between',
                  accountFilter === 'all'
                    ? 'bg-sky-500/15 text-sky-200 border-sky-500/40 font-semibold'
                    : 'bg-white/[0.03] text-slate-300 border-white/[0.08] hover:bg-white/[0.07] hover:text-white'
                )}
              >
                <div>
                  <div className="text-sm font-medium">All Accounts</div>
                  <div className="text-[11px] text-slate-500">Show transactions from every account</div>
                </div>
                {accountFilter === 'all' && <Check size={16} className="text-sky-400" />}
              </button>

              {/* Dynamic Account List from Backend */}
              {accounts.map((acc) => {
                const isSelected = accountFilter === acc._id;
                return (
                  <button
                    key={acc._id}
                    onClick={() => {
                      setAccountFilter(acc._id);
                      setPage(1);
                      setAccountModalOpen(false);
                    }}
                    className={cn(
                      'w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between',
                      isSelected
                        ? 'bg-sky-500/15 text-sky-200 border-sky-500/40 font-semibold'
                        : 'bg-white/[0.03] text-slate-300 border-white/[0.08] hover:bg-white/[0.07] hover:text-white'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{
                          background: acc.color ? `${acc.color}25` : '#38bdf825',
                          color: acc.color || '#38bdf8',
                        }}
                      >
                        <Wallet size={15} />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{acc.name}</div>
                        <div className="text-[11px] text-slate-400 capitalize">{acc.type}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-slate-300">
                        {formatCurrency(acc.currentBalance, currency)}
                      </div>
                      {isSelected && <span className="text-[10px] text-sky-400 font-medium">Selected</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── COMPREHENSIVE FILTER MODAL / BOTTOM SHEET ─────────────── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {filterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => setFilterModalOpen(false)} />
          <div className="relative z-10 w-full max-w-lg bg-[#121422] border border-white/10 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 animate-slide-up max-h-[88vh] overflow-y-auto shadow-2xl shadow-black/90 ring-1 ring-white/5 space-y-5">
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto sm:hidden" />

            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-brand-400" />
                <h2 className="text-base font-semibold text-white tracking-tight">Advanced Filters</h2>
              </div>
              <div className="flex items-center gap-2">
                {activeFiltersCount > 0 && (
                  <button
                    onClick={resetAllFilters}
                    className="text-xs text-rose-400 hover:text-rose-300 underline underline-offset-2"
                  >
                    Reset all
                  </button>
                )}
                <button
                  onClick={() => setFilterModalOpen(false)}
                  className="btn-ghost p-1.5 text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Section 1: Account */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Wallet size={13} className="text-sky-400" /> Account
              </label>
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => setAccountFilter('all')}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
                    accountFilter === 'all'
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-semibold'
                      : 'bg-white/[0.03] text-slate-300 border-white/10 hover:bg-white/[0.06]'
                  )}
                >
                  All Accounts ({accounts.length})
                </button>
                {accounts.map((acc) => (
                  <button
                    key={acc._id}
                    onClick={() => setAccountFilter(acc._id)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
                      accountFilter === acc._id
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-semibold'
                        : 'bg-white/[0.03] text-slate-300 border-white/10 hover:bg-white/[0.06]'
                    )}
                  >
                    {acc.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Section 2: Date Range */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Calendar size={13} className="text-indigo-400" /> Date Range
                </label>
                <button
                  onClick={() => {
                    setFilterModalOpen(false);
                    openDateModal('custom');
                  }}
                  className="text-[11px] text-brand-300 hover:text-brand-200 underline"
                >
                  Set custom dates →
                </button>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {DATE_PRESETS.filter((p) => p.value !== 'custom').map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setDatePreset(p.value)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
                      datePreset === p.value
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-semibold'
                        : 'bg-white/[0.03] text-slate-300 border-white/10 hover:bg-white/[0.06]'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {datePreset === 'custom' && (
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-300 flex items-center justify-between">
                  <span>Custom: {getDateLabel()}</span>
                  <button
                    onClick={() => {
                      setFilterModalOpen(false);
                      openDateModal('custom');
                    }}
                    className="text-brand-300 hover:underline text-[11px]"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            {/* Section 3: Categories */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <TagIcon size={13} className="text-emerald-400" /> Category
              </label>
              <div className="flex gap-1.5 flex-wrap max-h-36 overflow-y-auto pr-1">
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={cn(
                    'px-2.5 py-1 rounded-xl text-xs font-medium border transition-all',
                    categoryFilter === 'all'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold'
                      : 'bg-white/[0.03] text-slate-300 border-white/10 hover:bg-white/[0.06]'
                  )}
                >
                  All ({categories.length})
                </button>
                {categories.map((c) => (
                  <button
                    key={c._id}
                    onClick={() => setCategoryFilter(c._id)}
                    className={cn(
                      'px-2.5 py-1 rounded-xl text-xs font-medium border transition-all',
                      categoryFilter === c._id
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold'
                        : 'bg-white/[0.03] text-slate-300 border-white/10 hover:bg-white/[0.06]'
                    )}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Section 4: Amount Range */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <IndianRupee size={13} className="text-amber-400" /> Amount Range ({currency})
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <input
                    type="number"
                    placeholder="Min amount"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    className="w-full bg-[#0a0c14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="Max amount"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    className="w-full bg-[#0a0c14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>
              {/* Quick Amount Shortcuts */}
              <div className="flex gap-1.5 flex-wrap pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMinAmount('');
                    setMaxAmount('500');
                  }}
                  className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-slate-400 hover:text-white"
                >
                  &lt; 500
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMinAmount('500');
                    setMaxAmount('2000');
                  }}
                  className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-slate-400 hover:text-white"
                >
                  500 - 2,000
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMinAmount('2000');
                    setMaxAmount('10000');
                  }}
                  className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-slate-400 hover:text-white"
                >
                  2,000 - 10,000
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMinAmount('10000');
                    setMaxAmount('');
                  }}
                  className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-slate-400 hover:text-white"
                >
                  &gt; 10,000
                </button>
              </div>
            </div>

            {/* Apply Button */}
            <div className="pt-2 border-t border-white/[0.08] flex items-center gap-2">
              <button
                onClick={resetAllFilters}
                className="btn-secondary flex-1 text-xs py-2.5"
              >
                Reset All
              </button>
              <button
                onClick={() => {
                  setPage(1);
                  setFilterModalOpen(false);
                }}
                className="btn-primary flex-1 text-xs py-2.5 shadow-glow"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── SORT ORDER MODAL / BOTTOM SHEET ───────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {sortModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => setSortModalOpen(false)} />
          <div className="relative z-10 w-full max-w-sm bg-[#121422] border border-white/10 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 animate-slide-up shadow-2xl shadow-black/90 ring-1 ring-white/5">
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4 sm:hidden" />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ArrowUpDown size={18} className="text-brand-400" />
                <h2 className="text-base font-semibold text-white tracking-tight">Sort Transactions</h2>
              </div>
              <button
                onClick={() => setSortModalOpen(false)}
                className="btn-ghost p-1.5 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1.5">
              {SORT_OPTIONS.map((s) => {
                const isSelected = sortKey === s.value;
                return (
                  <button
                    key={s.value}
                    onClick={() => {
                      setSortKey(s.value);
                      setPage(1);
                      setSortModalOpen(false);
                    }}
                    className={cn(
                      'w-full p-3 rounded-xl border text-xs font-medium text-left transition-all flex items-center justify-between',
                      isSelected
                        ? 'bg-brand-500/20 text-brand-300 border-brand-500/40 font-semibold'
                        : 'bg-white/[0.03] text-slate-300 border-white/[0.08] hover:bg-white/[0.07] hover:text-white'
                    )}
                  >
                    <span>{s.label}</span>
                    {isSelected && <Check size={15} className="text-brand-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Transaction Add & Edit Modals ─────────────────────────── */}
      {showAdd && <QuickAddModal onClose={() => setShowAdd(false)} />}
      {editTx && <QuickAddModal onClose={() => setEditTx(null)} editTransaction={editTx} />}
    </div>
  );
}
