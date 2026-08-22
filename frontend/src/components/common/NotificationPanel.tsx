import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsAPI } from '../../services/api';
import { formatRelative } from '../../utils';
import { Bell, CheckCheck, AlertCircle, Clock, Target, Calendar, Trash2, X, CheckCircle2 } from 'lucide-react';
import { cn } from '../../utils';
import toast from 'react-hot-toast';

const TYPE_ICON: Record<string, any> = {
  bill_due: AlertCircle,
  recharge_due: Clock,
  sip_due: Calendar,
  goal_milestone: Target,
};

const TYPE_COLOR: Record<string, string> = {
  bill_due: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  recharge_due: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  sip_due: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  goal_milestone: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

export default function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'unread' | 'all'>('unread');
  const ref = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsAPI.list().then(r => r.data.data),
    refetchInterval: 60000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsAPI.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsAPI.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All marked as read');
    },
  });

  const deleteNotification = useMutation({
    mutationFn: (id: string) => notificationsAPI.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const clearAll = useMutation({
    mutationFn: () => notificationsAPI.clearAll(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications cleared');
    },
  });

  const unread = notifications.filter((n: any) => !n.isRead);
  const displayedNotifications = view === 'unread' ? unread : notifications;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="btn-ghost p-2 relative text-slate-400 hover:text-white"
        title="Notifications"
      >
        <Bell size={18} />
        {unread.length > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[#121422] border border-white/10 rounded-2xl overflow-hidden z-50 animate-fade-in shadow-2xl shadow-black/80 ring-1 ring-white/5">
          {/* Header */}
          <div className="p-3.5 border-b border-white/[0.08] bg-[#0f111c]">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="font-semibold text-white text-xs flex items-center gap-2">
                <span>Notifications</span>
                {unread.length > 0 && (
                  <span className="text-[10px] bg-brand-500/20 text-brand-300 px-2 py-0.5 rounded-full font-mono font-bold">
                    {unread.length} new
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                {unread.length > 0 && (
                  <button
                    onClick={() => markAllRead.mutate()}
                    disabled={markAllRead.isPending}
                    className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium transition-colors"
                    title="Mark all as read"
                  >
                    <CheckCheck size={13} />
                    <span className="hidden sm:inline">Mark read</span>
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={() => clearAll.mutate()}
                    disabled={clearAll.isPending}
                    className="text-xs text-rose-400/80 hover:text-rose-300 flex items-center gap-1 font-medium transition-colors"
                    title="Clear all notifications"
                  >
                    <Trash2 size={12} />
                    <span>Clear all</span>
                  </button>
                )}
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1.5 bg-white/[0.04] p-1 rounded-xl">
              <button
                onClick={() => setView('unread')}
                className={cn(
                  'flex-1 py-1 text-xs font-medium rounded-lg transition-all',
                  view === 'unread'
                    ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                Unread ({unread.length})
              </button>
              <button
                onClick={() => setView('all')}
                className={cn(
                  'flex-1 py-1 text-xs font-medium rounded-lg transition-all',
                  view === 'all'
                    ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                All ({notifications.length})
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-white/[0.06]">
            {displayedNotifications.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                {view === 'unread' ? 'All caught up! No unread notifications.' : 'No notifications yet.'}
              </div>
            ) : (
              displayedNotifications.map((n: any) => {
                const Icon = TYPE_ICON[n.type] || Bell;
                return (
                  <div
                    key={n._id}
                    className={cn(
                      'w-full flex items-start gap-3 p-3.5 text-left transition-colors group relative cursor-pointer',
                      !n.isRead ? 'bg-brand-500/[0.07] hover:bg-brand-500/[0.12]' : 'bg-transparent hover:bg-white/[0.04]'
                    )}
                    onClick={() => !n.isRead && markRead.mutate(n._id)}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 border',
                        TYPE_COLOR[n.type] || 'bg-white/10 text-slate-400 border-white/10'
                      )}
                    >
                      <Icon size={14} />
                    </div>

                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white truncate">{n.title}</span>
                        {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-slate-500 mt-1">{formatRelative(n.createdAt)}</p>
                    </div>

                    {/* Delete / Dismiss Button */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        deleteNotification.mutate(n._id);
                      }}
                      className="absolute right-3 top-3.5 p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all"
                      title="Dismiss notification"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
