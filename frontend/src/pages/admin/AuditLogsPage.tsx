import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { FileText, ArrowLeft, Search, Filter } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (actionFilter) params.action = actionFilter;
    if (entityFilter) params.entity_type = entityFilter;

    api.admin.auditLogs(params).then((data) => {
      setLogs(data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [actionFilter, entityFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Link to="/admin" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin Console
      </Link>

      <div className="space-y-2">
        <span className="text-xs font-bold font-mono uppercase tracking-wider text-sky-600 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-200">
          Compliance & Traceability
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          System Audit Trail & Event Logs
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Immutable audit record of all user logins, status transitions, review overrides, and evidence decisions.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-500">
            Showing <strong className="text-slate-900">{logs.length}</strong> audited events
          </span>

          <div className="flex items-center gap-2">
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg outline-none bg-white font-medium"
            >
              <option value="">All Entity Types</option>
              <option value="complaints">Complaints</option>
              <option value="maintenance_tasks">Maintenance Tasks</option>
              <option value="users">Users</option>
              <option value="organizations">Organizations</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading audit trail...</div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">No audit events found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase border-y border-slate-200 font-bold">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity Type</th>
                  <th className="py-3 px-4">Entity ID</th>
                  <th className="py-3 px-4">Actor ID</th>
                  <th className="py-3 px-4">Metadata Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-900">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-semibold">{log.entity_type}</td>
                    <td className="py-3 px-4 text-slate-500 truncate max-w-[120px]">{log.entity_id || '-'}</td>
                    <td className="py-3 px-4 text-slate-500 truncate max-w-[120px]">{log.actor_id || 'System'}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {JSON.stringify(log.metadata || {})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
