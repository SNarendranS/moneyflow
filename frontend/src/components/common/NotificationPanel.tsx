import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsAPI } from '../../services/api';
import { formatRelative } from '../../utils';
import { Bell, CheckCheck, AlertCircle, Clock, Target, Calendar } from 'lucide-react';
import { cn } from '../../utils';

const TYPE_ICON: Record<string, any> = {
  bill_due: AlertCircle,
  recharge_due: Clock,
  sip_due: Calendar,
  goal_milestone: Target,
};

const TYPE_COLOR: Record<string, string> = {
  bill_due: 'text-red-400 bg-red-500/10',
  recharge_due: 'text-amber-400 bg-amber-500/10',
  sip_due: 'text-purple-400 bg-purple-500/10',
  goal_milestone: 'text-emerald-400 bg-emerald-500/10',
};

export default function NotificationPanel() {
  const [open, setOpen] = useState(false);
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unread = notifications.filter((n: any) => !n.isRead);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} className="btn-ghost p-2 relative">
        <Bell size={18} />
        {unread.length > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 card overflow-hidden z-50 animate-fade-in shadow-2xl">
          <div className="flex items-center justify-between p-3.5 border-b border-white/10">
            <h3 className="font-semibold text-white text-sm">Notifications</h3>
            {unread.length > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
              >
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-10 text-muted text-sm">No notifications yet</div>
            ) : (
              <div className="divide-y divide-white/5">
                {notifications.map((n: any) => {
                  const Icon = TYPE_ICON[n.type] || Bell;
                  return (
                    <button
                      key={n._id}
                      onClick={() => !n.isRead && markRead.mutate(n._id)}
                      className={cn(
                        'w-full flex items-start gap-3 p-3.5 text-left hover:bg-white/5 transition-colors',
                        !n.isRead && 'bg-brand-500/[0.04]'
                      )}
                    >
                      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5', TYPE_COLOR[n.type] || 'bg-white/10 text-gray-400')}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white truncate">{n.title}</span>
                          {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{n.message}</p>
                        <p className="text-xs text-gray-600 mt-1">{formatRelative(n.createdAt)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
