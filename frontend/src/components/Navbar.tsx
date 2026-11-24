import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, DEMO_CREDENTIALS } from '../context/AuthContext';
import { api } from '../api/client';
import { Notification } from '../types';
import { RoadWatchLogo } from './RoadWatchLogo';
import {
  MapPin, Shield, Wrench, BarChart3, Bell, User as UserIcon,
  LogOut, PlusCircle, Layers, CheckCircle2, ChevronDown, Activity, Building2, ClipboardList
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isDemoUser, logout, quickDemoLogin, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [showAdminConsoles, setShowAdminConsoles] = useState(false);

  const demoMenuRef = React.useRef<HTMLDivElement>(null);
  const notifMenuRef = React.useRef<HTMLDivElement>(null);
  const adminConsolesRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (demoMenuRef.current && !demoMenuRef.current.contains(event.target as Node)) {
        setShowDemoMenu(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
        setShowNotifs(false);
      }
      if (adminConsolesRef.current && !adminConsolesRef.current.contains(event.target as Node)) {
        setShowAdminConsoles(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setShowAdminConsoles(false);
  }, [location.pathname]);

  useEffect(() => {
    if (user) {
      api.notifications.list().then((res) => {
        setNotifications(res.items || []);
        setUnreadCount(res.unread_count || 0);
      }).catch(() => {});
    }
  }, [user, location.pathname]);

  const handleMarkAllRead = async () => {
    await api.notifications.readAll().catch(() => {});
    setUnreadCount(0);
  };

  const isCurrent = (path: string) => location.pathname === path;
  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.roles?.includes('SUPER_ADMIN');

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 group hover:opacity-95 transition-opacity">
              <RoadWatchLogo size="md" />
            </Link>

            {/* Public Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                to="/map"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isCurrent('/map') ? 'bg-sky-50 text-sky-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Live Road Map
              </Link>
              <Link
                to="/rqi"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isCurrent('/rqi') ? 'bg-sky-50 text-sky-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Road Quality Index
              </Link>
              <Link
                to="/stats"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isCurrent('/stats') ? 'bg-sky-50 text-sky-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Public Transparency
              </Link>
              <Link
                to="/track"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isCurrent('/track') ? 'bg-sky-50 text-sky-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Track Status
              </Link>
              <Link
                to="/community"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isCurrent('/community') ? 'bg-sky-50 text-sky-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Discussions
              </Link>
              <Link
                to="/feedback"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isCurrent('/feedback') || isCurrent('/polls') ? 'bg-sky-50 text-sky-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Civic Polls
              </Link>
              {user?.role !== 'SUPER_ADMIN' && !user?.roles?.includes('SUPER_ADMIN') && !hasRole('SUPER_ADMIN') && !location.pathname.startsWith('/admin') && (
                <Link
                  to="/grievances"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isCurrent('/grievances') || isCurrent('/grievance/new')
                      ? 'bg-sky-50 text-sky-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Grievances
                </Link>
              )}
            </nav>
          </div>

          {/* Action Center & Role Switcher */}
          <div className="flex items-center gap-3">
            {/* Quick Demo Role Switcher Dropdown - ONLY shown for demo profiles */}
            {isDemoUser && (
              <div className="relative" ref={demoMenuRef}>
                <button
                  onClick={() => setShowDemoMenu(!showDemoMenu)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 transition-colors shadow-sm"
                  title="Switch demo profile instantly"
                >
                  <Activity className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden sm:inline">Demo:</span>
                  <span className="underline decoration-dotted font-bold">
                    {user ? user.role.replace('_', ' ') : 'Demo'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {showDemoMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Instant Demo Role Switch
                    </div>
                    {(Object.keys(DEMO_CREDENTIALS) as Array<keyof typeof DEMO_CREDENTIALS>).map((key) => {
                      const c = DEMO_CREDENTIALS[key];
                      const active = user?.email === c.email;
                      return (
                        <button
                          key={key}
                          onClick={async () => {
                            setShowDemoMenu(false);
                            await quickDemoLogin(key);
                            if (key === 'citizen') navigate('/citizen');
                            else if (key === 'officer') navigate('/authority');
                            else if (key === 'supervisor') navigate('/supervisor');
                            else if (key === 'contractor') navigate('/contractor');
                            else if (key === 'admin') navigate('/admin');
                          }}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-sky-50 transition-colors ${
                            active ? 'bg-sky-50 text-brand-700 font-bold' : 'text-slate-700'
                          }`}
                        >
                          <span>{c.label}</span>
                          {active && <CheckCircle2 className="w-4 h-4 text-brand-600" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Normal user account badge - shown when not in demo mode */}
            {user && !isDemoUser && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-slate-800">{user.name}</span>
                <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
                  {user.role.replace('_', ' ')}
                </span>
              </div>
            )}

            {/* Report Button */}
            <Link
              to="/report"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-brand-600 to-sky-600 hover:from-brand-700 hover:to-sky-700 text-white shadow-sm shadow-brand-500/20 transition-all hover:scale-[1.02]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report Defect</span>
            </Link>

            {/* Authenticated Workspace Links */}
            {user ? (
              <div className="flex items-center gap-2">
                {/* Super Admin Unified Management Dropdown (Defaults to Admin Console) */}
                {isSuperAdmin ? (
                  <div className="relative" ref={adminConsolesRef}>
                    <div className="hidden sm:inline-flex items-center rounded-xl border border-purple-200 bg-purple-50/80 p-0.5 shadow-xs">
                      <Link
                        to="/admin"
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          location.pathname.startsWith('/admin')
                            ? 'bg-purple-700 text-white shadow-xs'
                            : 'text-purple-800 hover:bg-purple-100/70'
                        }`}
                        title="Admin Central Management"
                      >
                        <Layers className="w-3.5 h-3.5 text-purple-600 group-hover:text-purple-800" />
                        <span>Admin Console</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => setShowAdminConsoles(!showAdminConsoles)}
                        className={`px-2 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${
                          showAdminConsoles
                            ? 'bg-purple-200 text-purple-900'
                            : 'text-purple-700 hover:bg-purple-100/70'
                        }`}
                        title="Consoles & Insights: Authority, Supervisor, Contractor"
                      >
                        <span className="text-[11px] font-semibold text-purple-700 hidden lg:inline">Consoles</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            showAdminConsoles ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    </div>

                    {showAdminConsoles && (
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-2">
                        <div className="px-3 py-2 border-b border-slate-100 mb-1 flex items-center justify-between">
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-wider text-purple-700">
                              Administrative Oversight
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium">
                              Unified console switcher for all operational roles
                            </div>
                          </div>
                          <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                            Super Admin
                          </span>
                        </div>

                        <div className="space-y-1">
                          {/* Admin Console (Default) */}
                          <Link
                            to="/admin"
                            onClick={() => setShowAdminConsoles(false)}
                            className={`flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors ${
                              location.pathname.startsWith('/admin')
                                ? 'bg-purple-50 text-purple-900 border border-purple-200 font-bold'
                                : 'text-slate-700 hover:bg-slate-50 font-medium'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                                <Layers className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                                  <span>Admin Console</span>
                                  <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-purple-200 text-purple-800 font-black">
                                    Default
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-normal">
                                  Platform governance, user verification & community
                                </div>
                              </div>
                            </div>
                            {location.pathname.startsWith('/admin') && (
                              <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0" />
                            )}
                          </Link>

                          {/* Authority Console */}
                          <Link
                            to="/authority"
                            onClick={() => setShowAdminConsoles(false)}
                            className={`flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors ${
                              location.pathname.startsWith('/authority')
                                ? 'bg-sky-50 text-brand-900 border border-sky-200 font-bold'
                                : 'text-slate-700 hover:bg-slate-50 font-medium'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-sky-100 text-brand-700 flex items-center justify-center shrink-0">
                                <Shield className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-bold text-slate-900">Authority Console</div>
                                <div className="text-[10px] text-slate-400 font-normal">
                                  PWD officer triage, work order dispatch & SLA approvals
                                </div>
                              </div>
                            </div>
                            {location.pathname.startsWith('/authority') && (
                              <span className="w-2 h-2 rounded-full bg-brand-600 shrink-0" />
                            )}
                          </Link>

                          {/* Supervisor Console */}
                          <Link
                            to="/supervisor"
                            onClick={() => setShowAdminConsoles(false)}
                            className={`flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors ${
                              location.pathname.startsWith('/supervisor')
                                ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 font-bold'
                                : 'text-slate-700 hover:bg-slate-50 font-medium'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                                <Building2 className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-bold text-slate-900">Supervisor Console</div>
                                <div className="text-[10px] text-slate-400 font-normal">
                                  Ground field triage, compaction logs & inspection audits
                                </div>
                              </div>
                            </div>
                            {location.pathname.startsWith('/supervisor') && (
                              <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                            )}
                          </Link>

                          {/* Contractor Hub */}
                          <Link
                            to="/contractor"
                            onClick={() => setShowAdminConsoles(false)}
                            className={`flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors ${
                              location.pathname.startsWith('/contractor')
                                ? 'bg-amber-50 text-amber-900 border border-amber-200 font-bold'
                                : 'text-slate-700 hover:bg-slate-50 font-medium'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                                <Wrench className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-bold text-slate-900">Contractor Hub</div>
                                <div className="text-[10px] text-slate-400 font-normal">
                                  Contractor work orders, repair execution & before/after logs
                                </div>
                              </div>
                            </div>
                            {location.pathname.startsWith('/contractor') && (
                              <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0" />
                            )}
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Authority Officer link */}
                    {user?.role === 'AUTHORITY_OFFICER' && (
                      <Link
                        to="/authority"
                        className={`hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border ${
                          location.pathname.startsWith('/authority')
                            ? 'bg-brand-50 border-brand-300 text-brand-700'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Shield className="w-3.5 h-3.5 text-brand-600" />
                        Authority Console
                      </Link>
                    )}

                    {/* Authority Supervisor link */}
                    {user?.role === 'AUTHORITY_SUPERVISOR' && (
                      <Link
                        to="/supervisor"
                        className={`hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border ${
                          location.pathname.startsWith('/supervisor')
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                        Supervisor Console
                      </Link>
                    )}

                    {/* Contractor Manager / Field link */}
                    {(user?.role === 'CONTRACTOR_MANAGER' || user?.role === 'CONTRACTOR_FIELD') && (
                      <Link
                        to="/contractor"
                        className={`hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border ${
                          location.pathname.startsWith('/contractor')
                            ? 'bg-amber-50 border-amber-300 text-amber-800'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Wrench className="w-3.5 h-3.5 text-amber-600" />
                        Contractor Hub
                      </Link>
                    )}

                    {/* Citizen "My Reports" link */}
                    {user?.role === 'CITIZEN' && (
                      <Link
                        to="/citizen"
                        className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                          location.pathname === '/citizen'
                            ? 'bg-brand-50 border-brand-300 text-brand-700 shadow-xs'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <ClipboardList className="w-3.5 h-3.5 text-brand-600" />
                        <span>My Reports</span>
                      </Link>
                    )}
                  </>
                )}

                {/* Notifications Bell */}
                <div className="relative" ref={notifMenuRef}>
                  <button
                    onClick={() => setShowNotifs(!showNotifs)}
                    className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg relative transition-colors"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifs && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                        <span className="text-xs font-bold text-slate-800">Notifications</span>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-[11px] text-brand-600 hover:underline"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-64 overflow-y-auto space-y-2">
                        {notifications.length === 0 ? (
                          <p className="text-xs text-slate-500 py-3 text-center">No notifications yet.</p>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              className={`p-2 rounded-lg text-xs ${n.read_at ? 'bg-slate-50 text-slate-600' : 'bg-sky-50 text-sky-900 font-medium'}`}
                            >
                              <div className="font-semibold">{n.title}</div>
                              <div className="text-[11px] text-slate-600 mt-0.5">{n.body}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Menu */}
                <Link
                  to="/citizen"
                  className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-slate-100 text-slate-700"
                  title="My Citizen Workspace"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                    {user.name.charAt(0)}
                  </div>
                </Link>

                <button
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-3 py-1.5 text-xs sm:text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
