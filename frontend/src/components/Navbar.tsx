import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, DEMO_CREDENTIALS } from '../context/AuthContext';
import { api } from '../api/client';
import { Notification } from '../types';
import {
  MapPin, Shield, Wrench, BarChart3, Bell, User as UserIcon,
  LogOut, PlusCircle, Layers, CheckCircle2, ChevronDown, Activity
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isDemoUser, logout, quickDemoLogin, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showDemoMenu, setShowDemoMenu] = useState(false);

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

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 to-sky-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-brand-800 to-sky-600">
                  RoadWatch
                </span>
                <span className="hidden sm:inline-block ml-2 px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-sky-100 text-sky-800 rounded">
                  GovTech 2.0
                </span>
              </div>
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
                to="/grievances"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isCurrent('/grievances') || isCurrent('/grievance/new')
                    ? 'bg-sky-50 text-sky-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Grievances
              </Link>
            </nav>
          </div>

          {/* Action Center & Role Switcher */}
          <div className="flex items-center gap-3">
            {/* Quick Demo Role Switcher Dropdown - ONLY shown for demo profiles */}
            {isDemoUser && (
              <div className="relative">
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
                            else if (key === 'officer' || key === 'supervisor') navigate('/authority');
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
                {/* Role Workspace Link */}
                {hasRole('AUTHORITY_OFFICER', 'AUTHORITY_SUPERVISOR') && (
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

                {hasRole('CONTRACTOR_MANAGER', 'CONTRACTOR_FIELD') && (
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

                {hasRole('SUPER_ADMIN') && (
                  <Link
                    to="/admin"
                    className={`hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border ${
                      location.pathname.startsWith('/admin')
                        ? 'bg-purple-50 border-purple-300 text-purple-700'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                    Admin
                  </Link>
                )}

                {/* Notifications Bell */}
                <div className="relative">
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
