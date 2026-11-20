import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import {
  Layers, Shield, Wrench, Eye, CheckCircle2, XCircle,
  FileText, Activity, Users, Settings, Bell, Send, AlertTriangle,
  Clock, Search, Filter, RefreshCw, UserCheck, UserX, MessageSquare
} from 'lucide-react';

type AdminTab = 'USERS' | 'NOTIFICATIONS' | 'GRIEVANCES' | 'ORGANIZATIONS';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('USERS');
  const [loading, setLoading] = useState(true);

  // 1. Users State
  const [users, setUsers] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState('ALL');
  const [usersLoading, setUsersLoading] = useState(false);

  // 2. Broadcast Notifications State
  const [targetType, setTargetType] = useState<'GLOBAL' | 'ROLE' | 'USER'>('GLOBAL');
  const [targetRole, setTargetRole] = useState('CITIZEN');
  const [targetEmail, setTargetEmail] = useState('');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState('ANNOUNCEMENT');
  const [notifPriority, setNotifPriority] = useState('NORMAL');
  const [notifSending, setNotifSending] = useState(false);
  const [notifFeedback, setNotifFeedback] = useState<{ success: boolean; msg: string } | null>(null);

  // 3. Grievances State
  const [grievances, setGrievances] = useState<any[]>([]);
  const [grievanceStats, setGrievanceStats] = useState<any>(null);
  const [grievanceFilter, setGrievanceFilter] = useState('ALL');
  const [grievancesLoading, setGrievancesLoading] = useState(false);
  const [selectedGrievance, setSelectedGrievance] = useState<any>(null);
  const [resolutionRemarks, setResolutionRemarks] = useState('');
  const [resolutionStatus, setResolutionStatus] = useState('RESOLVED');
  const [updatingGrievance, setUpdatingGrievance] = useState(false);

  // 4. Organizations & AI State
  const [orgs, setOrgs] = useState<any[]>([]);
  const [aiGov, setAiGov] = useState<any>(null);

  const fetchUsers = () => {
    setUsersLoading(true);
    const params: any = {};
    if (userSearch) params.q = userSearch;
    if (userRoleFilter !== 'ALL') params.role = userRoleFilter;
    if (userStatusFilter !== 'ALL') params.status = userStatusFilter;

    api.admin.users(params).then((res) => {
      setUsers(res.items || []);
      setUserStats(res.stats || null);
      setUsersLoading(false);
    }).catch(() => setUsersLoading(false));
  };

  const fetchGrievances = () => {
    setGrievancesLoading(true);
    const params: any = {};
    if (grievanceFilter !== 'ALL') params.status = grievanceFilter;

    api.grievances.list(params).then((res) => {
      setGrievances(res.items || []);
      setGrievanceStats(res.stats || null);
      setGrievancesLoading(false);
    }).catch(() => setGrievancesLoading(false));
  };

  const fetchOrgsAndAi = () => {
    Promise.all([
      api.admin.organizations(),
      api.ai.governance(),
    ]).then(([orgsRes, aiRes]) => {
      setOrgs(orgsRes || []);
      setAiGov(aiRes || null);
    }).catch(() => {});
  };

  useEffect(() => {
    setLoading(true);
    fetchUsers();
    fetchGrievances();
    fetchOrgsAndAi();
    setLoading(false);
  }, []);

  // Handle User Status Update (Approve, Reject, Suspend, Activate)
  const handleUserAction = async (userId: string, action: string, notes?: string) => {
    try {
      await api.admin.updateUserStatus(userId, action, { notes });
      alert(`User action '${action}' completed successfully.`);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Error updating user status.');
    }
  };

  // Handle Send Notification
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotifFeedback(null);
    setNotifSending(true);

    try {
      const payload: any = {
        target_type: targetType,
        title: notifTitle,
        message: notifMessage,
        type: notifType,
        priority: notifPriority,
      };
      if (targetType === 'ROLE') payload.target_role = targetRole;
      if (targetType === 'USER') payload.target_email = targetEmail;

      const res = await api.notifications.broadcast(payload);
      setNotifFeedback({
        success: true,
        msg: `Notification successfully dispatched to ${res.dispatched_count} user(s).`,
      });
      setNotifTitle('');
      setNotifMessage('');
      setTargetEmail('');
    } catch (err: any) {
      setNotifFeedback({
        success: false,
        msg: err.message || 'Failed to dispatch notification.',
      });
    } finally {
      setNotifSending(false);
    }
  };

  // Handle Grievance Status Update
  const handleUpdateGrievanceStatus = async () => {
    if (!selectedGrievance) return;
    setUpdatingGrievance(true);
    try {
      await api.grievances.updateStatus(selectedGrievance.id, {
        status: resolutionStatus,
        remarks: resolutionRemarks,
      });
      alert(`Grievance status updated to ${resolutionStatus}.`);
      setSelectedGrievance(null);
      setResolutionRemarks('');
      fetchGrievances();
    } catch (err: any) {
      alert(err.message || 'Error updating grievance.');
    } finally {
      setUpdatingGrievance(false);
    }
  };

  // Handle Org Status Update
  const handleVerifyOrg = async (orgId: string, status: string) => {
    try {
      await api.admin.verifyOrg(orgId, status);
      alert(`Organization status updated to ${status}.`);
      fetchOrgsAndAi();
    } catch (err: any) {
      alert(err.message || 'Error updating status.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Banner */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-400/30 rounded-full text-xs font-semibold">
            <Layers className="w-3.5 h-3.5" />
            <span>Platform Governance & Administration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            System Administration Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Manage user accounts & officer accreditations, broadcast notifications, adjudicate citizen grievances, and oversee contractor compliance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/audit-logs"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4 text-sky-400" />
            <span>Audit Trail</span>
          </Link>
          <Link
            to="/admin/ai-governance"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5"
          >
            <Eye className="w-4 h-4" />
            <span>AI Governance</span>
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('USERS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'USERS'
              ? 'bg-white text-purple-700 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Management</span>
          {userStats?.pending_count > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">
              {userStats.pending_count} pending
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('NOTIFICATIONS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'NOTIFICATIONS'
              ? 'bg-white text-purple-700 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Broadcast Notifications</span>
        </button>

        <button
          onClick={() => setActiveTab('GRIEVANCES')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'GRIEVANCES'
              ? 'bg-white text-purple-700 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          <span>Grievance Redressal</span>
          {grievanceStats?.filed > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">
              {grievanceStats.filed}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('ORGANIZATIONS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'ORGANIZATIONS'
              ? 'bg-white text-purple-700 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Organizations & Accreditations</span>
        </button>
      </div>

      {/* TAB 1: USER MANAGEMENT */}
      {activeTab === 'USERS' && (
        <div className="space-y-6">
          {/* Stats Bar */}
          {userStats && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-slate-500 block">Total Registered</span>
                <span className="text-xl font-black text-slate-900 font-mono">{userStats.total_users}</span>
              </div>
              <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 shadow-2xs">
                <span className="text-amber-800 font-bold block">Pending Approvals</span>
                <span className="text-xl font-black text-amber-900 font-mono">{userStats.pending_count}</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-slate-500 block">Active Citizens</span>
                <span className="text-xl font-black text-emerald-600 font-mono">{userStats.active_count}</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-slate-500 block">Authority Officers</span>
                <span className="text-xl font-black text-sky-600 font-mono">{userStats.officer_count}</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-slate-500 block">Contractor Managers</span>
                <span className="text-xl font-black text-amber-600 font-mono">{userStats.contractor_count}</span>
              </div>
            </div>
          )}

          {/* Verification Protocol & Hierarchy Banner */}
          <div className="bg-gradient-to-r from-purple-50 via-sky-50 to-amber-50 p-4 rounded-2xl border border-purple-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-purple-600 text-white rounded-lg">
                  <Shield className="w-4 h-4" />
                </span>
                <span className="text-xs font-black text-slate-900">
                  Profile Verification & Municipal Approval Hierarchy
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                <strong>Officer is verified by Admin</strong> &bull; <strong>Officer manages Contractors & Supervisors</strong> &bull; <strong>Supervisors & Contractors approved by Officer or Admin</strong>
              </p>
            </div>

            {/* Quick Filter Buttons for Pending Verifications */}
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  setUserRoleFilter('AUTHORITY_OFFICER');
                  setUserStatusFilter('PENDING_APPROVAL');
                  setTimeout(fetchUsers, 50);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                  userRoleFilter === 'AUTHORITY_OFFICER' && userStatusFilter === 'PENDING_APPROVAL'
                    ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                    : 'bg-white text-sky-800 border-sky-200 hover:bg-sky-50'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Pending Officers</span>
                {userStats?.pending_officers > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-sky-500 text-white text-[10px] font-black">
                    {userStats.pending_officers}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setUserRoleFilter('AUTHORITY_SUPERVISOR');
                  setUserStatusFilter('PENDING_APPROVAL');
                  setTimeout(fetchUsers, 50);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                  userRoleFilter === 'AUTHORITY_SUPERVISOR' && userStatusFilter === 'PENDING_APPROVAL'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-indigo-800 border-indigo-200 hover:bg-indigo-50'
                }`}
              >
                <span>Pending Supervisors</span>
                {userStats?.pending_supervisors > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-indigo-500 text-white text-[10px] font-black">
                    {userStats.pending_supervisors}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setUserRoleFilter('CONTRACTOR_MANAGER');
                  setUserStatusFilter('PENDING_APPROVAL');
                  setTimeout(fetchUsers, 50);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                  userRoleFilter === 'CONTRACTOR_MANAGER' && userStatusFilter === 'PENDING_APPROVAL'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white text-amber-900 border-amber-200 hover:bg-amber-50'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Pending Contractors</span>
                {userStats?.pending_contractors > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-black">
                    {userStats.pending_contractors}
                  </span>
                )}
              </button>

              {(userRoleFilter !== 'ALL' || userStatusFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setUserRoleFilter('ALL');
                    setUserStatusFilter('ALL');
                    setTimeout(fetchUsers, 50);
                  }}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                placeholder="Search by name, email, department, company, employee ID..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={userRoleFilter}
                onChange={(e) => { setUserRoleFilter(e.target.value); }}
                className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white outline-none"
              >
                <option value="ALL">All Roles</option>
                <option value="CITIZEN">Citizen</option>
                <option value="AUTHORITY_OFFICER">Authority Officer</option>
                <option value="AUTHORITY_SUPERVISOR">Authority Supervisor</option>
                <option value="CONTRACTOR_MANAGER">Contractor Manager</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>

              <select
                value={userStatusFilter}
                onChange={(e) => { setUserStatusFilter(e.target.value); }}
                className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <button
                onClick={fetchUsers}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-1.5 shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Apply</span>
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {usersLoading ? (
              <div className="py-12 text-center text-xs text-slate-500">Loading user directory...</div>
            ) : users.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">No users found matching criteria.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200 font-bold">
                    <tr>
                      <th className="py-3 px-4">User / Contact</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Organization / Credentials</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Registered</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{u.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                          {u.phone && <div className="text-[10px] text-slate-400">{u.phone}</div>}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            u.role === 'SUPER_ADMIN'
                              ? 'bg-purple-100 text-purple-800'
                              : u.role.includes('OFFICER') || u.role.includes('SUPERVISOR')
                              ? 'bg-sky-100 text-sky-800'
                              : u.role.includes('CONTRACTOR')
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}>
                            {u.role.replace('_', ' ')}
                          </span>
                          {u.account_status === 'PENDING_APPROVAL' && (
                            u.role === 'AUTHORITY_OFFICER' ? (
                              <span className="block mt-1 text-[9px] font-black text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                🛡️ Admin Verification Exclusive
                              </span>
                            ) : (
                              <span className="block mt-1 text-[9px] font-semibold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                👮 Approved by Officer / Admin
                              </span>
                            )
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">
                            {u.department || u.company_name || 'Public Citizen'}
                          </div>
                          {(u.employee_id || u.license_number) && (
                            <div className="text-[11px] text-slate-500 font-mono">
                              ID: {u.employee_id || u.license_number}
                            </div>
                          )}
                          {u.jurisdiction && (
                            <div className="text-[10px] text-slate-400">
                              Zone: {u.jurisdiction}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            u.account_status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : u.account_status === 'PENDING_APPROVAL'
                              ? 'bg-amber-50 text-amber-700 border border-amber-300 animate-pulse font-extrabold'
                              : u.account_status === 'SUSPENDED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {u.account_status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5">
                          {u.account_status === 'PENDING_APPROVAL' ? (
                            <>
                              <button
                                onClick={() => handleUserAction(u.id, 'APPROVE')}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] shadow-2xs"
                                title="Approve officer/contractor credentials"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  const reason = prompt('Enter reason for rejecting registration:');
                                  if (reason !== null) handleUserAction(u.id, 'REJECT', reason);
                                }}
                                className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg font-bold text-[11px]"
                              >
                                Reject
                              </button>
                            </>
                          ) : u.account_status === 'ACTIVE' ? (
                            <button
                              onClick={() => {
                                const reason = prompt('Enter reason for suspending user:');
                                if (reason !== null) handleUserAction(u.id, 'SUSPEND', reason);
                              }}
                              className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-lg font-bold text-[11px]"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUserAction(u.id, 'ACTIVATE')}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px]"
                            >
                              Reactivate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: BROADCAST NOTIFICATIONS */}
      {activeTab === 'NOTIFICATIONS' && (
        <div className="max-w-2xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Send className="w-5 h-5 text-purple-600" />
              <span>Broadcast & Targeted Notification Dispatcher</span>
            </h2>
            <p className="text-xs text-slate-500">
              Deliver official in-app notifications, emergency road alerts, or direct instructions to citizens, officers, or contractors.
            </p>
          </div>

          {notifFeedback && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                notifFeedback.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {notifFeedback.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{notifFeedback.msg}</span>
            </div>
          )}

          <form onSubmit={handleSendNotification} className="space-y-4">
            {/* Target Audience */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Target Audience *
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetType('GLOBAL')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    targetType === 'GLOBAL'
                      ? 'bg-purple-50 text-purple-700 border-purple-400 ring-1 ring-purple-400'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  🌐 All Users (Global)
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('ROLE')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    targetType === 'ROLE'
                      ? 'bg-purple-50 text-purple-700 border-purple-400 ring-1 ring-purple-400'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  👥 By Role
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('USER')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    targetType === 'USER'
                      ? 'bg-purple-50 text-purple-700 border-purple-400 ring-1 ring-purple-400'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  👤 Individual User
                </button>
              </div>
            </div>

            {targetType === 'ROLE' && (
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Select Role
                </label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl bg-white outline-none"
                >
                  <option value="CITIZEN">All Citizens</option>
                  <option value="AUTHORITY_OFFICER">All Authority Officers</option>
                  <option value="AUTHORITY_SUPERVISOR">All Authority Supervisors</option>
                  <option value="CONTRACTOR_MANAGER">All Contractor Managers</option>
                </select>
              </div>
            )}

            {targetType === 'USER' && (
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Recipient User Email *
                </label>
                <input
                  type="email"
                  required
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  placeholder="e.g. priya@roadwatch.org"
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            )}

            {/* Notification Category & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Type
                </label>
                <select
                  value={notifType}
                  onChange={(e) => setNotifType(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl bg-white outline-none"
                >
                  <option value="ANNOUNCEMENT">Official Announcement</option>
                  <option value="ALERT">Hazard / Weather Alert</option>
                  <option value="MAINTENANCE">Maintenance Notice</option>
                  <option value="INFO">Administrative Info</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Priority
                </label>
                <select
                  value={notifPriority}
                  onChange={(e) => setNotifPriority(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl bg-white outline-none"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent (Flash Notification)</option>
                </select>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Notification Subject / Title *
              </label>
              <input
                type="text"
                required
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                placeholder="e.g. Severe Rain Advisory: Pothole Reporting Drive Active"
                className="w-full p-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Message Body */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Notification Message Body *
              </label>
              <textarea
                required
                rows={4}
                value={notifMessage}
                onChange={(e) => setNotifMessage(e.target.value)}
                placeholder="Write your announcement or directive here..."
                className="w-full p-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={notifSending}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              {notifSending ? (
                <span>Dispatching Notifications...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Dispatch Notification Now</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: GRIEVANCE REDRESSAL DESK */}
      {activeTab === 'GRIEVANCES' && (
        <div className="space-y-6">
          {/* Grievance Stats */}
          {grievanceStats && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <span className="text-slate-500 block">Total Grievances</span>
                <span className="text-xl font-black text-slate-900 font-mono">{grievanceStats.total}</span>
              </div>
              <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200">
                <span className="text-rose-800 font-bold block">Newly Filed</span>
                <span className="text-xl font-black text-rose-900 font-mono">{grievanceStats.filed}</span>
              </div>
              <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-200">
                <span className="text-purple-800 font-bold block">Under Investigation</span>
                <span className="text-xl font-black text-purple-900 font-mono">{grievanceStats.under_investigation}</span>
              </div>
              <div className="bg-sky-50/70 p-4 rounded-2xl border border-sky-200">
                <span className="text-sky-800 font-bold block">Action Taken</span>
                <span className="text-xl font-black text-sky-900 font-mono">{grievanceStats.action_taken}</span>
              </div>
              <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200">
                <span className="text-emerald-800 font-bold block">Resolved</span>
                <span className="text-xl font-black text-emerald-900 font-mono">{grievanceStats.resolved}</span>
              </div>
            </div>
          )}

          {/* Grievance Filter */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Filter Status:</span>
              <select
                value={grievanceFilter}
                onChange={(e) => { setGrievanceFilter(e.target.value); }}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="FILED">Newly Filed</option>
                <option value="UNDER_INVESTIGATION">Under Investigation</option>
                <option value="ACTION_TAKEN">Action Taken</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>

            <button
              onClick={fetchGrievances}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {/* Grievances List */}
          {grievancesLoading ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading grievances...</div>
          ) : grievances.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">No grievances logged in this view.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {grievances.map((g) => (
                <div
                  key={g.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="font-mono text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                        {g.grievance_number}
                      </span>
                      <h3 className="font-black text-sm text-slate-900 mt-1">{g.title}</h3>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        g.status === 'RESOLVED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : g.status === 'UNDER_INVESTIGATION'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {g.status.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {g.description}
                  </p>

                  <div className="p-2.5 bg-slate-50 rounded-xl text-[11px] space-y-1 border border-slate-100">
                    <div className="flex justify-between text-slate-600">
                      <span>Complainant:</span>
                      <span className="font-bold text-slate-800">{g.citizen_name} ({g.citizen_email})</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Authority:</span>
                      <span className="font-bold text-slate-800">{g.authority_name}</span>
                    </div>
                    {g.complaint_id && (
                      <div className="flex justify-between text-slate-600">
                        <span>Linked Ref:</span>
                        <span className="font-mono font-bold text-brand-700">{g.complaint_id}</span>
                      </div>
                    )}
                  </div>

                  {g.resolution_remarks && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900">
                      <strong>Remarks:</strong> {g.resolution_remarks}
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => {
                        setSelectedGrievance(g);
                        setResolutionStatus(g.status === 'FILED' ? 'UNDER_INVESTIGATION' : 'RESOLVED');
                        setResolutionRemarks(g.resolution_remarks || '');
                      }}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-2xs"
                    >
                      Adjudicate / Update Status
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Adjudication Modal */}
          {selectedGrievance && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in">
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-rose-700">
                      {selectedGrievance.grievance_number}
                    </span>
                    <h3 className="text-base font-black text-slate-900">{selectedGrievance.title}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedGrievance(null)}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="text-xs space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div className="text-slate-500 font-semibold uppercase text-[10px]">Citizen Statement:</div>
                  <p className="text-slate-800 leading-relaxed">{selectedGrievance.description}</p>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                      Transition Status To:
                    </label>
                    <select
                      value={resolutionStatus}
                      onChange={(e) => setResolutionStatus(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl bg-white outline-none"
                    >
                      <option value="UNDER_INVESTIGATION">Under Investigation (Auditor Assigned)</option>
                      <option value="ACTION_TAKEN">Action Taken (Contractor Directed / Penalized)</option>
                      <option value="RESOLVED">Resolved (Official Corrective Repair Complete)</option>
                      <option value="REJECTED">Dismissed / Substandard Claim Rejected</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                      Official Resolution Remarks (Sent to Complainant):
                    </label>
                    <textarea
                      rows={3}
                      value={resolutionRemarks}
                      onChange={(e) => setResolutionRemarks(e.target.value)}
                      placeholder="e.g. Contractor served show-cause notice. Joint inspection verified road patch failure. Re-laying ordered within 24 hours under contractor warranty at zero municipal cost."
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedGrievance(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateGrievanceStatus}
                    disabled={updatingGrievance}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md"
                  >
                    {updatingGrievance ? 'Updating...' : 'Save Resolution'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ORGANIZATIONS & ACCREDITATIONS */}
      {activeTab === 'ORGANIZATIONS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-600" />
                <span>Contractors & Public Works Organizations</span>
              </h2>
              <p className="text-xs text-slate-500">Approve or suspend contractor participation</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase border-y border-slate-200 font-bold">
                <tr>
                  <th className="py-3 px-4">Organization Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Registration #</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Verification Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orgs.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-slate-900">{org.name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800">
                        {org.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{org.registration_number || 'N/A'}</td>
                    <td className="py-3 px-4 text-slate-600">{org.contact_email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                        org.verification_status === 'VERIFIED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {org.verification_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {org.verification_status !== 'VERIFIED' ? (
                        <button
                          onClick={() => handleVerifyOrg(org.id, 'VERIFIED')}
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700"
                        >
                          Approve
                        </button>
                      ) : (
                        <button
                          onClick={() => handleVerifyOrg(org.id, 'SUSPENDED')}
                          className="px-2.5 py-1 bg-slate-100 text-rose-700 hover:bg-rose-50 rounded-lg font-bold"
                        >
                          Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
