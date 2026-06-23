import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, Wallet, Tag, Target, RefreshCw,
  BarChart2, User, LogOut, Search, Menu, ChevronRight, Coins ,
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

  const Sidebar = ({ mobile = false }) => (
    <aside className={cn(
      'flex flex-col h-full bg-[#0d0d1a] border-r border-white/5',
      mobile ? 'w-72' : 'w-64'
    )}>
      {/* Logo */}
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center text-white font-bold">M</div>
          <span className="text-lg font-bold text-white">MoneyFlow</span>
        </div>
      </div>

      {/* Quick Add */}
      <div className="p-4">
        <button
          onClick={() => { setQuickAdd(true); setSidebarOpen(false); }}
          className="w-full btn-primary flex items-center justify-center gap-2 text-sm py-2.5"
        >
          <span className="text-lg font-bold leading-none">+</span>
          Add Transaction
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => cn('nav-item group', isActive && 'active')}
          >
            <Icon size={18} />
            <span className="flex-1">{label}</span>
            <ChevronRight size={14} className="opacity-0 group-hover:opacity-40 transition-opacity" />
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-white/5 space-y-1">
        <NavLink to="/profile" onClick={() => setSidebarOpen(false)} className={({ isActive }) => cn('nav-item', isActive && 'active')}>
          <User size={18} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">{user?.name}</div>
            <div className="text-xs text-gray-500 truncate">{user?.email}</div>
          </div>
        </NavLink>
        <button onClick={handleLogout} className="nav-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10 animate-slide-in">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex-shrink-0 h-14 flex items-center gap-3 px-4 border-b border-white/5 bg-[#0a0a14]/80 backdrop-blur-md">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden btn-ghost p-2">
            <Menu size={20} />
          </button>

          <button
            onClick={() => setSearchOpen(true)}
            className="flex-1 max-w-sm flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-500 hover:bg-white/8 hover:text-gray-400 transition-colors"
          >
            <Search size={15} />
            <span>Search transactions, goals…</span>
            <span className="ml-auto text-xs bg-white/10 px-1.5 py-0.5 rounded">⌘K</span>
          </button>

          <div className="ml-auto flex items-center gap-1">
            <NotificationPanel />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 max-w-7xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      {quickAdd && <QuickAddModal onClose={() => setQuickAdd(false)} />}
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
    </div>
  );
}
