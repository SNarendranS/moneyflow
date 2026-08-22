import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, Wallet, Tag, Target, RefreshCw,
  BarChart2, User, LogOut, Search, Menu, ChevronRight, Coins, Plus,
  Sparkles, Layers
} from 'lucide-react';
import { useAuth } from '../store/auth';
import { cn } from '../utils';
import QuickAddModal from '../components/transactions/QuickAddModal';
import SearchModal from '../components/common/SearchModal';
import NotificationPanel from '../components/common/NotificationPanel';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/accounts', icon: Wallet, label: 'Accounts' },
  { to: '/categories', icon: Tag, label: 'Categories' },
  { to: '/goals', icon: Target, label: 'Goals' },
  { to: '/recurring', icon: RefreshCw, label: 'Recurring' },
  { to: '/lending', icon: Coins, label: 'Lending' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickAdd, setQuickAdd] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  const Sidebar = ({ mobile = false }) => (
    <aside className={cn(
      'flex flex-col h-full bg-[#0b0d14] border-r border-white/[0.08]',
      mobile ? 'w-72' : 'w-64'
    )}>
      {/* Brand Header */}
      <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-brand-600 to-indigo-500 rounded-xl flex items-center justify-center text-white shadow-glow border border-white/20 flex-shrink-0">
            <Layers size={18} />
          </div>
          <div>
            <span className="text-base font-bold text-white tracking-tight block leading-tight">Cash Canvas</span>
            <span className="text-[11px] text-slate-500 font-medium">Financial OS</span>
          </div>
        </div>
      </div>

      {/* Quick Add Button */}
      <div className="p-4 pb-2">
        <button
          onClick={() => { setQuickAdd(true); setSidebarOpen(false); }}
          className="w-full btn-primary flex items-center justify-center gap-2 text-sm py-2.5 shadow-glow"
        >
          <Plus size={16} />
          <span>New Transaction</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">Navigation</div>
        {NAV.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => cn('nav-item group', isActive && 'active')}
          >
            <Icon size={17} className="transition-transform group-hover:scale-110" />
            <span className="flex-1">{label}</span>
            <ChevronRight size={14} className="opacity-0 group-hover:opacity-40 transition-opacity" />
          </NavLink>
        ))}
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-white/[0.08] space-y-1 bg-[#090a10]/50">
        <NavLink
          to="/profile"
          onClick={() => setSidebarOpen(false)}
          className={({ isActive }) => cn('nav-item', isActive && 'active')}
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500/20 to-purple-500/20 border border-brand-500/30 flex items-center justify-center text-brand-300 font-bold text-xs flex-shrink-0">
            {userInitial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">{user?.name}</div>
            <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
          </div>
        </NavLink>
        <button
          onClick={handleLogout}
          className="nav-item w-full text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
        >
          <LogOut size={16} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#08090e]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10 animate-slide-in">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex-shrink-0 h-16 flex items-center gap-3 px-4 lg:px-6 border-b border-white/[0.08] bg-[#090a10]/80 backdrop-blur-xl relative z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden btn-ghost p-2 text-slate-400 hover:text-white"
            aria-label="Open sidebar menu"
          >
            <Menu size={20} />
          </button>

          {/* Search Trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex-1 max-w-sm flex items-center gap-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2 text-sm text-slate-400 hover:bg-white/[0.07] hover:text-slate-300 hover:border-white/[0.12] transition-all"
          >
            <Search size={15} className="text-slate-500" />
            <span>Search transactions, accounts, goals…</span>
            <span className="ml-auto text-[10px] font-mono bg-white/[0.08] border border-white/10 px-1.5 py-0.5 rounded text-slate-400">⌘K</span>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setQuickAdd(true)}
              className="hidden sm:flex items-center gap-1.5 btn-secondary text-xs py-2 px-3"
            >
              <Plus size={14} />
              <span>Add</span>
            </button>
            <NotificationPanel />
          </div>
        </header>

        {/* Page View */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 max-w-7xl mx-auto animate-fade-in space-y-6">
            <Outlet />
          </div>
        </main>
      </div>

      {quickAdd && <QuickAddModal onClose={() => setQuickAdd(false)} />}
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
    </div>
  );
}
