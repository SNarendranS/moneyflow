import { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowLeftRight, Wallet, Tag, Target, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';
import { searchAPI } from '../../services/api';
import { formatCurrency, getTransactionColor } from '../../utils';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/auth';

export default function SearchModal({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!q.trim()) {
      setResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await searchAPI.search(q);
        setResults(data.data);
      } catch {}
      setLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  const go = (path: string) => {
    navigate(path);
    onClose();
  };

  const currency = user?.currency || 'INR';
  const hasResults = results && Object.values(results).some((arr: any) => arr.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl bg-[#121422] border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/90 ring-1 ring-white/5 animate-slide-up">
        {/* Search Header */}
        <div className="flex items-center gap-3 p-4 border-b border-white/[0.08] bg-[#0f111c]">
          <Search size={18} className="text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search transactions, accounts, categories, goals…"
            className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-sm font-medium"
          />
          {q && (
            <button onClick={() => setQ('')} className="text-slate-400 hover:text-white transition-colors">
              <X size={16} />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-[11px] font-mono border border-white/10 px-2 py-0.5 rounded-md bg-white/[0.04]"
          >
            ESC
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-3">
          {loading && <div className="text-center py-8 text-slate-500 text-xs">Searching database…</div>}

          {!loading && q && !hasResults && (
            <div className="text-center py-8 text-slate-500 text-xs">No records found matching "{q}"</div>
          )}

          {!q && (
            <div className="text-center py-8 text-slate-500 text-xs">
              Quickly find any transaction, bank account, tag, or target goal
            </div>
          )}

          {results?.transactions?.length > 0 && (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-2 mb-1.5">Transactions</p>
              <div className="space-y-1">
                {results.transactions.map((tx: any) => (
                  <button
                    key={tx._id}
                    onClick={() => go('/transactions')}
                    className="w-full flex items-center gap-3 p-2.5 hover:bg-white/[0.04] rounded-xl transition-colors text-left border border-transparent hover:border-white/[0.06]"
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs flex-shrink-0 ${
                      tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' :
                      tx.type === 'expense' ? 'bg-rose-500/10 text-rose-400' :
                      tx.type === 'investment' ? 'bg-violet-500/10 text-violet-400' :
                      'bg-sky-500/10 text-sky-400'
                    }`}>
                      {tx.type === 'income' ? <TrendingUp size={14} /> :
                       tx.type === 'expense' ? <TrendingDown size={14} /> :
                       tx.type === 'investment' ? <PiggyBank size={14} /> :
                       <ArrowLeftRight size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white truncate">
                        {tx.notes || tx.categoryId?.name || tx.incomeSource || tx.type}
                      </div>
                      <div className="text-[11px] text-slate-500">{tx.accountId?.name}</div>
                    </div>
                    <span className={`text-xs font-mono font-bold ${getTransactionColor(tx.type)}`}>
                      {formatCurrency(tx.amount, currency)}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {results?.accounts?.length > 0 && (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-2 mb-1.5">Accounts</p>
              <div className="space-y-1">
                {results.accounts.map((acc: any) => (
                  <button
                    key={acc._id}
                    onClick={() => go('/accounts')}
                    className="w-full flex items-center gap-3 p-2.5 hover:bg-white/[0.04] rounded-xl transition-colors text-left border border-transparent hover:border-white/[0.06]"
                  >
                    <Wallet size={15} className="text-sky-400 flex-shrink-0" />
                    <span className="text-xs font-semibold text-white">{acc.name}</span>
                    <span className="ml-auto text-[11px] text-slate-500 capitalize">{acc.type}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {results?.goals?.length > 0 && (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-2 mb-1.5">Goals</p>
              <div className="space-y-1">
                {results.goals.map((goal: any) => (
                  <button
                    key={goal._id}
                    onClick={() => go('/goals')}
                    className="w-full flex items-center gap-3 p-2.5 hover:bg-white/[0.04] rounded-xl transition-colors text-left border border-transparent hover:border-white/[0.06]"
                  >
                    <Target size={15} className="text-brand-400 flex-shrink-0" />
                    <span className="text-xs font-semibold text-white">{goal.title}</span>
                    <span className="ml-auto text-xs font-mono text-slate-400">{formatCurrency(goal.targetAmount, currency)}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {results?.tags?.length > 0 && (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-2 mb-1.5">Tags</p>
              <div className="flex flex-wrap gap-1.5 px-2">
                {results.tags.map((tag: any) => (
                  <button
                    key={tag._id}
                    onClick={() => go('/transactions')}
                    className="badge bg-white/[0.04] text-slate-300 border-white/[0.08] hover:bg-white/[0.08]"
                  >
                    <Tag size={11} style={{ color: tag.color }} />
                    <span>{tag.name}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
