import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Activity, Shield, Users, FileText, MessageSquare, Briefcase, Clock, DollarSign, Network, Sun, Moon, Monitor, LogOut, Settings, Plus, Users2, AlertTriangle } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';

export default function Sidebar({ businessData, myHomes, selectedHomeId, setSelectedHomeId, isAdmin, hasResellerProfile, impersonatingId, theme, toggleTheme, isAgency }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className={`w-20 md:w-64 border-r border-border bg-surface/50 pt-4 pb-6 flex flex-col items-center md:items-start flex-shrink-0 relative z-20 ${impersonatingId ? 'pt-10' : ''}`}>
      <div className="w-full px-4 mb-4">
        <Link 
          to="/dashboard" 
          onClick={() => setSelectedHomeId(null)}
          className="text-xl font-sans font-bold tracking-tight flex items-center gap-2 mb-2 w-full pr-2"
        >
          <div className="flex-shrink-0 text-primary"><Brain /></div>
          <span className="hidden md:inline line-clamp-1 leading-tight text-lg text-foreground">{businessData?.businessName || 'Agentic Home Care OS'}</span>
        </Link>
      </div>

      <div className="w-full px-2 mb-6">
        {hasResellerProfile && (
          <Link to="/reseller-portal" className="flex items-center gap-3 w-full px-3 py-4 text-sm rounded-xl font-bold transition-all text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border-2 border-amber-500/20 shadow-xl shadow-amber-500/10 group">
            <Network className="w-5 h-5 shrink-0 group-hover:rotate-12 transition-transform" />
            <div className="hidden md:flex flex-col">
              <span className="leading-tight">Partner Portal</span>
              <span className="text-[10px] text-amber-500/60 font-medium uppercase tracking-tighter">Switch View</span>
            </div>
          </Link>
        )}
      </div>

      <nav className="flex flex-col gap-1 w-full px-2">
        <h4 className="hidden md:block text-xs font-bold text-muted uppercase tracking-widest mb-2 px-2">Management</h4>
        <NavButton 
          to="/dashboard" 
          icon={<Briefcase />} 
          label={isAgency ? "Agency Portfolio" : "Business Portfolio"} 
          active={location.pathname.replace(/\/$/, '') === '/dashboard' && !selectedHomeId} 
          impersonatingId={impersonatingId}
          onClick={() => setSelectedHomeId(null)}
        />
      </nav>

      <AnimatePresence>
        {selectedHomeId && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            exit={{ opacity: 0, height: 0 }}
            className="w-full overflow-hidden"
          >
            <nav className="flex flex-col gap-1 mt-6 w-full px-2">
              <h4 className="hidden md:block text-xs font-bold text-muted uppercase tracking-widest mb-2 px-2">{isAgency ? 'Agency Ops' : 'Facility Ops'}</h4>
              <NavButton to="/dashboard" icon={<Activity />} label="Overview" active={location.pathname.replace(/\/$/, '') === '/dashboard' && selectedHomeId} impersonatingId={impersonatingId} />
              <NavButton to="/dashboard/compliance" icon={<Shield />} label="State Compliance" active={location.pathname.replace(/\/$/, '') === '/dashboard/compliance'} impersonatingId={impersonatingId} />
              <NavButton to="/dashboard/roster" icon={<Users />} label={isAgency ? "Client Roster" : "Resident Roster"} active={location.pathname.replace(/\/$/, '') === '/dashboard/roster'} impersonatingId={impersonatingId} />
              <NavButton to="/dashboard/intake" icon={<FileText />} label="Intake Pipeline" active={location.pathname.replace(/\/$/, '') === '/dashboard/intake'} impersonatingId={impersonatingId} />
              <NavButton to="/dashboard/incidents" icon={<AlertTriangle />} label="Incidents" active={location.pathname.replace(/\/$/, '') === '/dashboard/incidents'} impersonatingId={impersonatingId} />
              <NavButton to="/dashboard/logs" icon={<MessageSquare />} label="System Logs" active={location.pathname.replace(/\/$/, '') === '/dashboard/logs'} impersonatingId={impersonatingId} />
              <NavButton to="/dashboard/forms" icon={<FileText />} label="State Forms" active={location.pathname.replace(/\/$/, '') === '/dashboard/forms'} impersonatingId={impersonatingId} />
            </nav>

            <nav className="flex flex-col gap-1 mt-6 w-full px-2">
              <h4 className="hidden md:block text-xs font-bold text-muted uppercase tracking-widest mb-2 px-2">Operations</h4>
              <NavButton to="/dashboard/hr" icon={<Briefcase />} label="Staff HR" active={location.pathname.replace(/\/$/, '') === '/dashboard/hr'} impersonatingId={impersonatingId} />
              <NavButton to="/dashboard/evv" icon={<Clock />} label="Time & EVV" active={location.pathname.replace(/\/$/, '') === '/dashboard/evv'} impersonatingId={impersonatingId} />
              <NavButton to="/dashboard/billing" icon={<DollarSign />} label="Billing" active={location.pathname.replace(/\/$/, '') === '/dashboard/billing'} impersonatingId={impersonatingId} />
              <NavButton to="/dashboard/family" icon={<Users2 />} label="Family Portal" active={location.pathname.replace(/\/$/, '') === '/dashboard/family'} impersonatingId={impersonatingId} />
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 pt-4 border-t border-border w-full flex flex-col gap-2 px-2">
        {isAdmin && (
          <Link to="/platform" className="flex items-center justify-center md:justify-start gap-3 w-full px-3 py-3 text-sm rounded-lg font-bold transition-all text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 shadow-lg shadow-indigo-500/10">
            <Shield className="w-5 h-5 md:w-4 md:h-4 shrink-0" />
            <span className="hidden md:inline">Super Admin View</span>
          </Link>
        )}
        {!hasResellerProfile && (
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('becomeReseller'))}
            className="flex items-center justify-center md:justify-start gap-3 w-full px-3 py-3 text-sm rounded-lg font-bold transition-all text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 shadow-lg shadow-amber-500/10"
          >
            <Network className="w-5 h-5 md:w-4 md:h-4 shrink-0" />
            <span className="hidden md:inline">Become a Reseller</span>
          </button>
        )}
      </div>

      <div className="mt-auto pt-8 border-t border-border w-full">
        {isAdmin && (
          <div className="px-3 py-4 bg-primary/10 border border-primary/20 rounded-xl mb-4 mx-2">
            <div className="flex items-center gap-2 text-primary mb-3">
              <Shield className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Support Tools</span>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-bold text-muted uppercase">Impersonate Home ID</label>
              <div className="flex gap-1">
                <input 
                  type="text" 
                  placeholder="Enter Home ID" 
                  defaultValue={impersonatingId || ''}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = e.currentTarget.value.trim();
                      const currentPath = window.location.pathname;
                      if (val) {
                        window.location.href = `${currentPath}?impersonate=${val}`;
                      } else {
                        window.location.href = currentPath;
                      }
                    }
                  }}
                  className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-[10px] focus:outline-none focus:border-primary/50"
                />
              </div>
              <p className="text-[8px] text-muted-foreground italic">Press Enter to jump</p>
            </div>
          </div>
        )}

        <div className="px-3 py-2 mb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-muted uppercase tracking-widest hidden md:inline">System Telemetry</span>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] text-emerald-500 font-bold hidden md:inline">STABLE</span>
            </div>
          </div>
          <div className="hidden md:grid grid-cols-2 gap-2">
            <div className="bg-surface-hover p-2 rounded-lg text-center">
              <p className="text-[8px] text-muted mb-1 uppercase">Nvidia</p>
              <p className="text-[10px] font-mono">12ms</p>
            </div>
            <div className="bg-surface-hover p-2 rounded-lg text-center">
              <p className="text-[8px] text-muted mb-1 uppercase">Gemini</p>
              <p className="text-[10px] font-mono">OK</p>
            </div>
          </div>
        </div>

        <div className="w-full px-2">
          <NavButton to="/dashboard/settings" icon={<FileText />} label="Business Profile" active={location.pathname.replace(/\/$/, '') === '/dashboard/settings'} impersonatingId={impersonatingId} />
        </div>


        <button onClick={async () => { await signOut(auth); window.location.href = '/'; }} className="flex items-center gap-3 w-full px-3 py-3 rounded-lg font-medium transition-all text-rose-400 hover:bg-rose-500/10 mt-1">
          <LogOut className="w-5 h-5" />
          <span className="hidden md:inline">Sign Out</span>
        </button>
      </div>
    </div>
  );
}

function NavButton({ to, icon, label, active, impersonatingId, onClick }) {
  const targetUrl = impersonatingId ? `${to}${to.includes('?') ? '&' : '?'}impersonate=${impersonatingId}` : to;

  return (
    <Link 
      to={targetUrl} 
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-3 py-3 text-sm rounded-lg font-bold transition-all ${active ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted hover:bg-surface-hover hover:text-foreground'}`}
    >
      {React.cloneElement(icon, { className: 'w-4 h-4' })}
      <span className="hidden md:inline">{label}</span>
    </Link>
  );
}
