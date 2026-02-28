import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Moon, Dumbbell, Brain, RefreshCw, LogOut, ChevronRight,
  Rss, Compass, User,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth, useSync } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useSocial';

const NAV_MAIN = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/sleep',     icon: Moon,            label: 'Sommeil' },
  { to: '/workouts',  icon: Dumbbell,        label: 'Entraînements' },
  { to: '/insights',  icon: Brain,           label: 'Insights' },
];

const NAV_SOCIAL = [
  { to: '/feed',     icon: Rss,     label: 'Fil d\'actualité' },
  { to: '/discover', icon: Compass, label: 'Découvrir' },
  { to: '/profile',  icon: User,    label: 'Mon profil' },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const sync             = useSync();
  const navigate         = useNavigate();
  const { data: notifData } = useNotifications();
  const unread              = notifData?.unreadCount ?? 0;

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
      isActive
        ? 'bg-brand-green/15 text-brand-green border border-brand-green/20'
        : 'text-slate-400 hover:text-white hover:bg-white/5',
    );

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col bg-surface-1 border-r border-white/5 min-h-screen">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-brand-green/20 border border-brand-green/30 flex items-center justify-center">
            <span className="text-brand-green font-bold text-sm">PQ</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">PulseIQ</h1>
            <p className="text-xs text-slate-500">Performance Dashboard</p>
          </div>
        </div>
      </div>

      {/* User */}
      {user && (
        <div className="px-4 py-4 border-b border-white/5">
          <div
            className="flex items-center gap-3 px-2 py-2 rounded-xl bg-white/5 cursor-pointer hover:bg-white/10 transition-colors"
            onClick={() => navigate('/profile')}
          >
            <div className="h-8 w-8 rounded-full bg-brand-blue/30 border border-brand-blue/20 flex items-center justify-center text-xs font-bold text-brand-blue">
              {user.first_name?.[0]}{user.last_name?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.first_name} {user.last_name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main nav */}
      <nav className="px-3 py-4 space-y-1">
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-3 mb-2">Performance</p>
        {NAV_MAIN.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={navLinkClass}>
            <Icon size={18} />
            <span className="flex-1">{label}</span>
            <ChevronRight size={14} className="opacity-40" />
          </NavLink>
        ))}
      </nav>

      {/* Social nav */}
      <nav className="px-3 pb-4 space-y-1 border-t border-white/5 pt-4">
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-3 mb-2">Social</p>
        {NAV_SOCIAL.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={navLinkClass}>
            <Icon size={18} />
            <span className="flex-1">{label}</span>
            {to === '/feed' && unread > 0 && (
              <span className="h-5 min-w-5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom actions */}
      <div className="px-3 py-4 border-t border-white/5 space-y-1">
        <button
          onClick={() => sync.mutate(false)}
          disabled={sync.isPending}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-150"
        >
          <RefreshCw size={18} className={sync.isPending ? 'animate-spin text-brand-green' : ''} />
          <span>{sync.isPending ? 'Syncing…' : 'Synchroniser'}</span>
        </button>
        <button
          onClick={() => logout.mutate()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-brand-red hover:bg-brand-red/10 transition-all duration-150"
        >
          <LogOut size={18} />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
