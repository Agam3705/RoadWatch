import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import {
  Layers, Shield, Wrench, Eye, CheckCircle2, XCircle,
  FileText, Activity, Users, Settings
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [aiGov, setAiGov] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = () => {
    setLoading(true);
    Promise.all([
      api.admin.organizations(),
      api.ai.governance(),
    ]).then(([orgsRes, aiRes]) => {
      setOrgs(orgsRes || []);
      setAiGov(aiRes || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleVerifyOrg = async (orgId: string, status: string) => {
    try {
      await api.admin.verifyOrg(orgId, status);
      alert(`Organization status updated to ${status}.`);
      fetchAdminData();
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
            Manage organization accreditations, audit trails, and oversee computer vision model performance and human-in-the-loop agreement rates.
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

      {/* AI Governance KPI Banner */}
      {aiGov && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Eye className="w-5 h-5 text-purple-600" />
                Active Vision Model: {aiGov.model_name}
              </h2>
              <p className="text-xs text-slate-500">Active Production Version: {aiGov.active_version}</p>
            </div>
            <Link to="/admin/ai-governance" className="text-xs font-bold text-purple-600 hover:underline">
              View Detailed Metrics &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-500 block">Total Inferences Run</span>
              <span className="text-xl font-mono font-black text-slate-900">{aiGov.total_inferences}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-500 block">Human Agreement Rate</span>
              <span className="text-xl font-mono font-black text-emerald-600">{aiGov.human_agreement_rate_pct}%</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-500 block">Reviewed by Officers</span>
              <span className="text-xl font-mono font-black text-slate-900">{aiGov.reviewed_count}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-500 block">Modifications / Overrides</span>
              <span className="text-xl font-mono font-black text-amber-600">{aiGov.modified_count}</span>
            </div>
          </div>
        </div>
      )}

      {/* Organization Verification Management */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-600" />
              Contractors & Public Works Organizations
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
    </div>
  );
};
