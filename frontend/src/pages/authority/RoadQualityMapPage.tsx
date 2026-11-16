import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { RoadQualityRecord } from '../../types';
import { ShieldCheck, BarChart3, AlertTriangle, ArrowRight, Layers, MapPin } from 'lucide-react';

export const RoadQualityMapPage: React.FC = () => {
  const [roadRecords, setRoadRecords] = useState<RoadQualityRecord[]>([]);
  const [selectedRoadHistory, setSelectedRoadHistory] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.analytics.roads().then((data) => {
      setRoadRecords(data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleInspectRoad = async (roadId: string) => {
    try {
      const hist = await api.geo.roadHistory(roadId);
      setSelectedRoadHistory(hist);
    } catch {
      alert('Could not retrieve road history.');
    }
  };

  const getBandBadge = (band: string) => {
    switch (band) {
      case 'EXCELLENT':
      case 'GOOD':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Good ({band})</span>;
      case 'FAIR':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">Fair</span>;
      case 'POOR':
      case 'CRITICAL':
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">Poor / Critical</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <span className="text-xs font-bold font-mono uppercase tracking-wider text-brand-600 bg-brand-50 px-2.5 py-1 rounded-md border border-brand-200">
          GIS Pavement Analytics
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
          Road Quality Index (RQI) Inspector
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
          Algorithmic assessment of municipal road condition based on normalized damage severity, recurrence frequency, and unresolved maintenance backlogs.
        </p>
      </div>

      {/* RQI Formula Card */}
      <div className="p-5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-sky-400">INDEX FORMULATION (v1.0)</span>
          <span className="text-[11px] text-slate-400">Scale: 0 (Impassable) to 100 (Pristine)</span>
        </div>
        <div className="font-mono text-sm text-sky-300 font-bold">
          RQI = 100 - (0.40 &times; D + 0.25 &times; U + 0.20 &times; F + 0.15 &times; A)
        </div>
        <div className="text-[11px] text-slate-300">
          D = Damage Burden | U = Unresolved Ratio | F = Recurrence in Same Segment | A = Open Age Burden
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Table of Roads */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand-600" />
            Monitored Road Network Segments
          </h2>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading road metrics...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase border-y border-slate-200 font-bold">
                  <tr>
                    <th className="py-3 px-4">Road Name</th>
                    <th className="py-3 px-4">Classification</th>
                    <th className="py-3 px-4">RQI Score</th>
                    <th className="py-3 px-4">Condition</th>
                    <th className="py-3 px-4">Defects (Open/Total)</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {roadRecords.map((r) => (
                    <tr key={r.road_id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-900">{r.road_name}</td>
                      <td className="py-3 px-4 font-semibold text-slate-600">{r.road_type}</td>
                      <td className="py-3 px-4 font-mono font-black text-base text-brand-700">{r.rqi_score}</td>
                      <td className="py-3 px-4">{getBandBadge(r.condition_band)}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-amber-600">{r.open_defects}</span> / {r.total_defects}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleInspectRoad(r.road_id)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          <span>History</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Selected Road History Drawer */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-brand-600" />
            Road Maintenance & Defect History
          </h3>

          {selectedRoadHistory ? (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="font-bold text-slate-900 text-sm">
                  {selectedRoadHistory.road?.name}
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  Type: {selectedRoadHistory.road?.road_type} &bull; Recurrence Risk:{' '}
                  <span className="font-bold text-rose-600">
                    {selectedRoadHistory.metrics?.recurrence_indicator}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase">Reported Defects History</span>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedRoadHistory.complaints_history?.map((c: any) => (
                    <div key={c.id} className="p-2.5 bg-slate-50 rounded-lg text-xs border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-800">{c.public_reference}</span>
                        <span className="text-[10px] text-slate-400">{c.status}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 line-clamp-1">{c.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-slate-400 space-y-2">
              <MapPin className="w-8 h-8 text-slate-300 mx-auto" />
              <p>Click "History" on any road above to view segment maintenance logs, past defects, and recurrence patterns.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
