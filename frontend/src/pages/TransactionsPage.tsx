import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsAPI } from '../services/api';
import { formatCurrency, formatDate, getTransactionColor, getTransactionBg, getTransactionSign } from '../utils';
import { useAuth } from '../store/auth';
import {
  Trash2, Plus, Filter, ChevronLeft, ChevronRight, Pencil,
  TrendingUp, TrendingDown, ArrowLeftRight, PiggyBank
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../utils';
import QuickAddModal from '../components/transactions/QuickAddModal';

const TYPE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'expense', label: 'Expenses' },
  { value: 'income', label: 'Income' },
  { value: 'investment', label: 'Investments' },
  { value: 'transfer', label: 'Transfers' },
];

export default function TransactionsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const currency = user?.currency || 'INR';

  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [editTx, setEditTx] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', { page, type: typeFilter }],
    queryFn: () => transactionsAPI.list({
      page,
      limit: 20,
      ...(typeFilter !== 'all' ? { type: typeFilter } : {}),
    }).then(r => r.data.data),
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Transactions</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {pagination?.total ?? 0} recorded transaction{pagination?.total === 1 ? '' : 's'}
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          <span>Add Transaction</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={15} className="text-slate-500 mr-1" />
        {TYPE_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => { setTypeFilter(f.value); setPage(1); }}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all border',
              typeFilter === f.value
                ? 'bg-brand-500/20 text-brand-300 border-brand-500/40 shadow-glow'
                : 'bg-white/[0.04] text-slate-400 border-white/[0.08] hover:text-white hover:bg-white/[0.08]'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Transactions List Card */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            Loading transactions…
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-300 font-medium mb-1">No transactions found</p>
            <p className="text-xs text-slate-500 mb-4">Record your expenses, earnings, and investments</p>
            <button onClick={() => setShowAdd(true)} className="btn-primary text-xs inline-flex items-center gap-1.5">
              <Plus size={14} /> Add Transaction
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {transactions.map((tx: any) => (
              <div
                key={tx._id}
                className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-white/[0.03] transition-colors group"
              >
                {/* Type Icon Badge */}
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-xs font-semibold flex-shrink-0 border', getTransactionBg(tx.type))}>
                  {tx.type === 'income' ? <TrendingUp size={15} /> :
                   tx.type === 'expense' ? <TrendingDown size={15} /> :
                   tx.type === 'investment' ? <PiggyBank size={15} /> :
                   <ArrowLeftRight size={15} />}
                </div>

                {/* Description & Metadata */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">
                    {tx.type === 'expense' && (tx.categoryId?.name || 'Expense')}
                    {tx.type === 'income' && (tx.categoryId?.name || tx.incomeSource || 'Income')}
                    {tx.type === 'transfer' && (
                      tx.toExternal
                        ? `To ${tx.toExternal}`
                        : `${tx.fromAccountId?.name || '?'} → ${tx.toAccountId?.name || '?'}`
                    )}
                    {tx.type === 'investment' && (tx.categoryId?.name || tx.investmentName || tx.investmentType || 'Investment')}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 flex-wrap">
                    <span>{formatDate(tx.date)}</span>
                    {tx.accountId && <span>· {tx.accountId.name}</span>}
                    {tx.type === 'income' && tx.categoryId && tx.incomeSource && (
                      <span className="text-emerald-400/80 truncate max-w-32">· {tx.incomeSource}</span>
                    )}
                    {tx.type === 'investment' && tx.categoryId && tx.investmentName && (
                      <span className="text-violet-400/80 truncate max-w-32">· {tx.investmentName}</span>
                    )}
                    {tx.subCategoryId && (
                      <span className="text-slate-400 truncate max-w-28">· {tx.subCategoryId.name}</span>
                    )}
                    {tx.notes && <span className="text-slate-500 truncate max-w-32">· {tx.notes}</span>}
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
                          borderColor: tag.color + '30'
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Amount */}
                <div className={cn('text-sm font-mono font-bold', getTransactionColor(tx.type))}>
                  {getTransactionSign(tx.type)}{formatCurrency(tx.amount, currency)}
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

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={!pagination.hasPrev}
              className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
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
