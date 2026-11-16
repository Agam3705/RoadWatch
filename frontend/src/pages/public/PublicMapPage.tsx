import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Complaint, Road } from '../../types';
import { MapView } from '../../components/MapView';
import { StatusBadge } from '../../components/StatusBadge';
import { DamageBadge } from '../../components/DamageBadge';
import { PriorityBadge } from '../../components/PriorityBadge';
import { Link } from 'react-router-dom';
import { Filter, Search, Layers, MapPin, Eye, ThumbsUp } from 'lucide-react';

export const PublicMapPage: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [roads, setRoads] = useState<Road[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [category, setCategory] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchComplaints = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (category) params.category = category;
    if (status) params.status = status;
    if (search) params.search = search;

    api.complaints.list(params).then((res) => {
      setComplaints(res.items || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchComplaints();
    api.geo.roads().then(setRoads).catch(() => {});
  }, [category, status]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header & Filter Controls */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <MapPin className="w-6 h-6 text-brand-600" />
              Live Road Condition & Defect Map
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Interactive geospatial tracking of reported road issues, active work orders, and completed repairs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1.5 bg-slate-100 rounded-lg text-slate-700">
              Showing <span className="text-brand-600 font-bold">{complaints.length}</span> Defects
            </span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search reference or street..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchComplaints()}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none bg-white"
          >
            <option value="">All Damage Categories</option>
            <option value="POTHOLE">Potholes</option>
            <option value="LONGITUDINAL_CRACK">Longitudinal Cracks</option>
            <option value="ALLIGATOR_CRACK">Alligator Cracking</option>
            <option value="SUBSIDENCE">Subsidence / Settlement</option>
            <option value="RUTTING">Rutting</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none bg-white"
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="APPROVED">Approved for Maintenance</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="PENDING_VERIFICATION">Pending Verification</option>
            <option value="RESOLVED">Resolved & Verified</option>
          </select>

          <button
            onClick={() => { setCategory(''); setStatus(''); setSearch(''); }}
            className="text-xs px-3 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold rounded-xl transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Main Map & Drawer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <MapView
            complaints={complaints}
            roads={roads}
            height="580px"
            onMarkerClick={(c) => setSelectedComplaint(c)}
          />
        </div>

        {/* Selected Complaint / Inspector Panel */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 h-[580px] overflow-y-auto">
            {selectedComplaint ? (
              <div className="space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="font-mono text-sm font-black text-slate-900">
                    {selectedComplaint.public_reference}
                  </span>
                  <StatusBadge status={selectedComplaint.status} />
                </div>

                {selectedComplaint.images && selectedComplaint.images.length > 0 && (
                  <div className="rounded-xl overflow-hidden bg-slate-900 h-44">
                    <img
                      src={
                        selectedComplaint.images[0].url.startsWith('http')
                          ? selectedComplaint.images[0].url
                          : `http://localhost:8000${selectedComplaint.images[0].url}`
                      }
                      alt="Defect"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <DamageBadge category={selectedComplaint.category} />
                    <PriorityBadge priority={selectedComplaint.priority} level={selectedComplaint.citizen_severity} />
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {selectedComplaint.description}
                  </p>

                  <div className="text-[11px] text-slate-500 pt-1">
                    Coordinates:{' '}
                    <span className="font-mono text-slate-700">
                      {selectedComplaint.location.coordinates[1].toFixed(5)}, {selectedComplaint.location.coordinates[0].toFixed(5)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-500">
                    Corroboration: <strong className="text-slate-800">{selectedComplaint.support_count || 0} Citizens</strong>
                  </span>
                  <Link
                    to={`/complaints/${selectedComplaint.id || selectedComplaint.public_reference}`}
                    className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg text-xs transition-colors"
                  >
                    Full Details &rarr;
                  </Link>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
                <MapPin className="w-10 h-10 text-slate-300 stroke-[1.5]" />
                <h3 className="text-sm font-bold text-slate-700">No Defect Selected</h3>
                <p className="text-xs text-slate-500 max-w-xs">
                  Click on any marker on the map to inspect defect photographs, AI classification, priority score, and repair state.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
