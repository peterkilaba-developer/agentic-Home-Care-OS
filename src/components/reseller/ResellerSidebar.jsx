import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Brain, Activity, Network, DollarSign, Settings, Globe, LogOut, Sun, Moon, Monitor, ShieldCheck, Users, TrendingUp, LayoutDashboard } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';

export default function ResellerSidebar({ brand, isAdmin, isProvider, theme, toggleTheme }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="w-20 md:w-64 border-r border-border bg-surface/50 pt-4 pb-6 flex flex-col items-center md:items-start flex-shrink-0 relative z-20">
      <div className="w-full px-4 mb-8">
        <Link to="/" className="text-xl font-sans font-bold tracking-tight flex items-center gap-2 mb-2 w-full pr-2">
          <div className="flex-shrink-0 text-primary"><Brain /></div>
          <span className="hidden md:inline line-clamp-1 leading-tight text-lg text-foreground">Agentic Home Care OS</span>
        </Link>
        <p className="hidden md:block text-[10px] font-bold text-muted uppercase tracking-widest pl-1 mt-1">Reseller Portal</p>
      </div>

      <div className="w-full px-2 mb-6">
        {isProvider && (
          <Link to="/dashboard" className="flex items-center gap-3 w-full px-3 py-4 text-sm rounded-xl font-bold transition-all text-primary bg-primary/10 hover:bg-primary/20 border-2 border-primary/20 shadow-xl shadow-primary/10 group">
            <LayoutDashboard className="w-5 h-5 shrink-0 group-hover:rotate-12 transition-transform" />
            <div className="hidden md:flex flex-col">
              <span className="leading-tight">Operations Dashboard</span>
              <span className="text-[10px] text-primary/60 font-medium uppercase tracking-tighter">Switch View</span>
            </div>
          </Link>
        )}
      </div>

      <nav className="flex flex-col gap-1 w-full px-2">
        <h4 className="hidden md:block text-xs font-bold text-muted uppercase tracking-widest mb-2 px-2">Management</h4>
        <NavButton to="/reseller-portal" icon={<Activity />} label="Overview" active={location.pathname === '/reseller-portal'} />
        <NavButton to="/reseller-portal/ledger" icon={<DollarSign />} label="Connect Ledger" active={location.pathname === '/reseller-portal/ledger'} />
      </nav>

      <div className="mt-4 pt-4 border-t border-border w-full flex flex-col gap-2 px-2">
        {isAdmin && (
          <Link to="/platform" className="flex items-center justify-center md:justify-start gap-3 w-full px-3 py-3 text-sm rounded-lg font-bold transition-all text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 shadow-lg shadow-indigo-500/10">
            <ShieldCheck className="w-5 h-5 md:w-4 md:h-4 shrink-0" />
            <span className="hidden md:inline">Super Admin View</span>
          </Link>
        )}
      </div>

      <div className="mt-auto pt-8 border-t border-border w-full">
        <div className="px-3 py-2 mb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-muted uppercase tracking-widest hidden md:inline">Ecosystem Status</span>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[9px] text-indigo-500 font-bold hidden md:inline">ACTIVE</span>
            </div>
          </div>
        </div>

        <div className="w-full px-2">
          <NavButton to="/reseller-portal/settings" icon={<Settings />} label="Portal Settings" active={location.pathname === '/reseller-portal/settings'} />
        </div>


        <button onClick={async () => { await signOut(auth); window.location.href = '/'; }} className="flex items-center gap-3 w-full px-3 py-3 rounded-lg font-medium transition-all text-rose-400 hover:bg-rose-500/10 mt-1">
          <LogOut className="w-5 h-5" />
          <span className="hidden md:inline">Sign Out</span>
        </button>
      </div>
    </div>
  );
}

function NavButton({ to, icon, label, active }) {
  return (
    <Link to={to} className={`flex items-center gap-3 w-full px-3 py-3 text-sm rounded-lg font-bold transition-all ${active ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted hover:bg-surface-hover hover:text-foreground'}`}>
      {React.cloneElement(icon, { className: 'w-4 h-4' })}
      <span className="hidden md:inline">{label}</span>
    </Link>
  );
}
