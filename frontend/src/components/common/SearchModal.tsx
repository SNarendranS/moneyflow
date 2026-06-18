import { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowLeftRight, Wallet, Tag, Target } from 'lucide-react';
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

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!q.trim()) { setResults(null); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await searchAPI.search(q);
        setResults(data.data);
      } catch {}
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  const go = (path: string) => { navigate(path); onClose(); };
  const currency = user?.currency || 'INR';
  const hasResults = results && Object.values(results).some((arr: any) => arr.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl card overflow-hidden animate-slide-up">
        <div className="flex items-center gap-3 p-4 border-b border-white/10">
          <Search size={18} className="text-gray-500 flex-shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search transactions, accounts, goals…"
            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
          />
          {q && <button onClick={() => setQ('')} className="text-gray-500 hover:text-gray-300"><X size={16} /></button>}
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xs border border-white/10 px-2 py-1 rounded-lg">Esc</button>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {loading && <div className="text-center py-8 text-muted">Searching…</div>}

          {!loading && q && !hasResults && (
            <div className="text-center py-8 text-muted">No results for "{q}"</div>
          )}

          {!q && (
            <div className="text-center py-8 text-muted text-sm">Type to search transactions, accounts, categories, tags, and goals</div>
          )}

          {results?.transactions?.length > 0 && (
            <section className="mb-3">
              <p className="text-xs text-gray-500 font-medium px-2 py-1">Transactions</p>
              {results.transactions.map((tx: any) => (
                <button key={tx._id} onClick={() => go('/transactions')} className="w-full flex items-center gap-3 p-2.5 hover:bg-white/5 rounded-xl transition-colors text-left">
                  <ArrowLeftRight size={14} className={getTransactionColor(tx.type)} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{tx.notes || tx.categoryId?.name || tx.incomeSource || tx.type}</div>
                    <div className="text-xs text-gray-500">{tx.accountId?.name}</div>
                  </div>
                  <span className={`text-sm font-mono ${getTransactionColor(tx.type)}`}>{formatCurrency(tx.amount, currency)}</span>
                </button>
              ))}
            </section>
          )}

          {results?.accounts?.length > 0 && (
            <section className="mb-3">
              <p className="text-xs text-gray-500 font-medium px-2 py-1">Accounts</p>
              {results.accounts.map((acc: any) => (
                <button key={acc._id} onClick={() => go('/accounts')} className="w-full flex items-center gap-3 p-2.5 hover:bg-white/5 rounded-xl transition-colors text-left">
                  <Wallet size={14} className="text-blue-400" />
                  <span className="text-sm text-white">{acc.name}</span>
                  <span className="ml-auto text-xs text-gray-500">{acc.type}</span>
                </button>
              ))}
            </section>
          )}

          {results?.goals?.length > 0 && (
            <section className="mb-3">
              <p className="text-xs text-gray-500 font-medium px-2 py-1">Goals</p>
              {results.goals.map((goal: any) => (
                <button key={goal._id} onClick={() => go('/goals')} className="w-full flex items-center gap-3 p-2.5 hover:bg-white/5 rounded-xl transition-colors text-left">
                  <Target size={14} className="text-brand-400" />
                  <span className="text-sm text-white">{goal.title}</span>
                  <span className="ml-auto text-xs text-gray-500">{formatCurrency(goal.targetAmount, currency)}</span>
                </button>
              ))}
            </section>
          )}

          {results?.tags?.length > 0 && (
            <section>
              <p className="text-xs text-gray-500 font-medium px-2 py-1">Tags</p>
              {results.tags.map((tag: any) => (
                <button key={tag._id} onClick={() => go('/transactions')} className="w-full flex items-center gap-3 p-2.5 hover:bg-white/5 rounded-xl transition-colors text-left">
                  <Tag size={14} style={{ color: tag.color }} />
                  <span className="text-sm text-white">{tag.name}</span>
                </button>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
