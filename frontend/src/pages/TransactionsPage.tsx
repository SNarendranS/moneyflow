import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsAPI } from '../services/api';
import { formatCurrency, formatDate, getTransactionColor, getTransactionBg, getTransactionSign } from '../utils';
import { useAuth } from '../store/auth';
import { Trash2, Plus, Filter, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../utils';
import QuickAddModal from '../components/transactions/QuickAddModal';

const TYPE_FILTERS = ['all', 'income', 'expense', 'transfer', 'investment'];

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
    onError: () => toast.error('Failed to delete'),
  });

  const transactions = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-muted mt-0.5">
            {pagination?.total ?? 0} total transactions
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={15} className="text-gray-500" />
        {TYPE_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => { setTypeFilter(f); setPage(1); }}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize',
              typeFilter === f
                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:border-white/20'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16 text-muted">
            <p className="text-lg mb-2">No transactions yet</p>
            <p className="text-sm">Add your first transaction to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {transactions.map((tx: any) => (
              <div key={tx._id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.03] transition-colors group">
                {/* Type badge */}
                <div className={cn('badge', getTransactionBg(tx.type))}>
                  {tx.type}
                </div>

                {/* Description */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {tx.type === 'expense' && (tx.categoryId?.name || 'Expense')}
                    {tx.type === 'income' && (tx.incomeSource || 'Income')}
                    {tx.type === 'transfer' && (
                      tx.toExternal
                        ? `To ${tx.toExternal}`
                        : `${tx.fromAccountId?.name || '?'} → ${tx.toAccountId?.name || '?'}`
                    )}
                    {tx.type === 'investment' && (tx.investmentName || tx.investmentType || 'Investment')}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500">{formatDate(tx.date)}</span>
                    {tx.accountId && <span className="text-xs text-gray-600">· {tx.accountId.name}</span>}
                    {tx.notes && <span className="text-xs text-gray-600 truncate max-w-32">· {tx.notes}</span>}
                  </div>
                </div>

                {/* Tags */}
                {tx.tags?.length > 0 && (
                  <div className="hidden sm:flex gap-1">
                    {tx.tags.slice(0, 2).map((tag: any) => (
                      <span key={tag._id} className="text-xs px-2 py-0.5 rounded-md" style={{ background: tag.color + '22', color: tag.color }}>
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Amount */}
                <div className={cn('text-base font-mono font-semibold', getTransactionColor(tx.type))}>
                  {getTransactionSign(tx.type)}{formatCurrency(tx.amount, currency)}
                </div>

                {/* Edit + Delete */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => setEditTx(tx)}
                    className="btn-ghost p-1.5 text-brand-400 hover:text-brand-300 hover:bg-brand-500/10"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this transaction?')) deleteMutation.mutate(tx._id);
                    }}
                    className="btn-ghost p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10"
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
          <span className="text-sm text-muted">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={!pagination.hasPrev}
              className="btn-secondary px-3 py-2 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!pagination.hasNext}
              className="btn-secondary px-3 py-2 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {showAdd && <QuickAddModal onClose={() => setShowAdd(false)} />}
      {editTx && <QuickAddModal onClose={() => setEditTx(null)} editTransaction={editTx} />}
    </div>
  );
}
