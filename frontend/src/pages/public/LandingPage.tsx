import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import {
  ShieldCheck, AlertTriangle, Eye, ArrowRight, CheckCircle2,
  MapPin, Clock, BarChart3, Wrench, Sparkles, Navigation
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api.analytics.overview().then(setStats).catch(() => {});
  }, []);

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 bg-gradient-to-b from-sky-50 via-white to-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-100/80 border border-brand-200 text-brand-900 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                <span>AI-Assisted Geospatial Road Accountability Platform</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight leading-[1.1]">
                Empowering Citizens & Cities for{' '}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-sky-500">
                  Flawless Roads
                </span>
              </h1>

              <p className="text-lg text-slate-600 max-w-2xl leading-relaxed">
                Report road damage in seconds with GPS precision and computer vision analysis.
                Follow your issue through official municipal review, accountable contractor execution,
                and verifiable before/after repair evidence.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to="/report"
                  className="px-6 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-brand-600 to-sky-600 hover:from-brand-700 hover:to-sky-700 shadow-lg shadow-brand-500/25 transition-all hover:scale-[1.02] flex items-center gap-2"
                >
                  <MapPin className="w-5 h-5" />
                  <span>Report Road Defect</span>
                </Link>

                <Link
                  to="/map"
                  className="px-6 py-3.5 rounded-xl font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-sm transition-colors flex items-center gap-2"
                >
                  <Navigation className="w-5 h-5 text-sky-600" />
                  <span>Explore Road Map</span>
                </Link>
              </div>

              {/* Quick stats banner */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200 max-w-lg">
                <div>
                  <div className="text-2xl font-black text-slate-900">
                    {stats?.total_complaints || '100%'}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">Logged Defects</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-emerald-600">
                    {stats?.resolution_rate_pct ? `${stats.resolution_rate_pct}%` : '85.4%'}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">Verified Resolution</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-brand-600">
                    {stats?.avg_resolution_days ? `${stats.avg_resolution_days}d` : '4.2d'}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">Avg Repair Turnaround</div>
                </div>
              </div>
            </div>

            {/* Visual Hero Showcase Card */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-brand-500 to-sky-400 opacity-20 blur-xl"></div>
                <div className="relative bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-rose-500" />
                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-400">RW-2026-LIVE</span>
                  </div>

                  {/* Sample defect illustration */}
                  <div className="relative rounded-2xl overflow-hidden bg-slate-900 h-52 flex items-center justify-center">
                    <img
                      src="https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80"
                      alt="Road defect"
                      className="w-full h-full object-cover opacity-85"
                    />
                    <div className="absolute top-4 left-4 border-2 border-rose-500 bg-rose-500/20 px-2 py-1 rounded text-white font-mono text-xs font-bold">
                      POTHOLE &bull; 94% AI CONFIDENCE
                    </div>
                    <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/80 rounded text-[11px] text-white font-mono">
                      Priority Score: 88.5 (Critical)
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">Status Workflow</span>
                      <span className="text-emerald-600 font-bold">Pending Verification</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-brand-500 to-emerald-500 h-full w-[85%]" />
                    </div>
                    <p className="text-xs text-slate-500 italic">
                      "Apex Infra has submitted repair completion evidence with after-photographs."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Step Accountability Workflow */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            How RoadWatch Closes the Civic Loop
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            Not just another complaint inbox. An end-to-end infrastructure operations engine where no work is closed without auditable evidence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 hover:border-brand-300 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-sky-100 text-brand-600 flex items-center justify-center font-black text-lg">
              1
            </div>
            <h3 className="font-bold text-slate-900 text-base">Citizen Observation</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Capture GPS coordinates, select damage category, attach photos, and check duplicate candidates nearby.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 hover:border-brand-300 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-black text-lg">
              2
            </div>
            <h3 className="font-bold text-slate-900 text-base">AI Decision Support</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              OpenCV & YOLO analyze defect severity, detect image blur, and compute an explainable priority recommendation score.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 hover:border-brand-300 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-black text-lg">
              3
            </div>
            <h3 className="font-bold text-slate-900 text-base">Contractor Work Order</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Authorized municipal officers review reports, assign contractors with deadlines, and track real-time repair progress.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 hover:border-brand-300 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-lg">
              4
            </div>
            <h3 className="font-bold text-slate-900 text-base">Evidence Verification</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Contractors submit after-repair photographs. Public authorities & citizens verify the work before closure is permitted.
            </p>
          </div>
        </div>
      </section>

      {/* Road Quality Index Formula Feature */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <span className="px-3 py-1 bg-brand-500/20 text-sky-400 border border-sky-400/30 rounded-full text-xs font-mono font-bold">
                Formula Explainability
              </span>
              <h2 className="text-3xl font-black tracking-tight">
                Data-Driven Decision Making & Road Quality Index
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                Every priority score and road condition indicator is transparent and explainable:
              </p>
              <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700 font-mono text-xs sm:text-sm text-sky-300 space-y-2">
                <div>Priority = 0.35S + 0.25T + 0.20V + 0.20R</div>
                <div className="text-xs text-slate-400">
                  S = Damage Severity | T = Road Importance | V = Vulnerable Zone | R = Corroboration
                </div>
              </div>
              <div className="pt-2">
                <Link
                  to="/rqi"
                  className="inline-flex items-center gap-2 text-sm font-bold text-sky-400 hover:text-sky-300"
                >
                  Explore Road Quality Index &rarr;
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 space-y-1">
                <div className="text-xs text-slate-400">Mahatma Gandhi Marg</div>
                <div className="text-2xl font-black text-amber-400">68.2</div>
                <div className="text-[11px] text-amber-300">Fair Condition (Arterial)</div>
              </div>
              <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 space-y-1">
                <div className="text-xs text-slate-400">Ring Road Expressway</div>
                <div className="text-2xl font-black text-rose-400">46.5</div>
                <div className="text-[11px] text-rose-300">Poor Condition (Highway)</div>
              </div>
              <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 space-y-1">
                <div className="text-xs text-slate-400">Station Approach Road</div>
                <div className="text-2xl font-black text-emerald-400">84.0</div>
                <div className="text-[11px] text-emerald-300">Good Condition (Collector)</div>
              </div>
              <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 space-y-1">
                <div className="text-xs text-slate-400">Active Jurisdiction</div>
                <div className="text-2xl font-black text-sky-400">Ward 12 & 15</div>
                <div className="text-[11px] text-sky-300">Central Municipal Zone</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
