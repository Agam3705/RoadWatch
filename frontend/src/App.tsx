import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';

// Public Pages
import { LandingPage } from './pages/public/LandingPage';
import { PublicMapPage } from './pages/public/PublicMapPage';
import { ComplaintLookupPage } from './pages/public/ComplaintLookupPage';
import { PublicStatsPage } from './pages/public/PublicStatsPage';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';

// Citizen Pages
import { CitizenDashboard } from './pages/citizen/CitizenDashboard';
import { ReportIssuePage } from './pages/citizen/ReportIssuePage';
import { ReportDetailPage } from './pages/citizen/ReportDetailPage';

// Authority Pages
import { AuthorityDashboard } from './pages/authority/AuthorityDashboard';
import { ReviewQueuePage } from './pages/authority/ReviewQueuePage';
import { ComplaintReviewDetailPage } from './pages/authority/ComplaintReviewDetailPage';
import { EvidenceVerificationPage } from './pages/authority/EvidenceVerificationPage';
import { RoadQualityMapPage } from './pages/authority/RoadQualityMapPage';

// Contractor Pages
import { ContractorDashboard } from './pages/contractor/ContractorDashboard';
import { TaskDetailPage } from './pages/contractor/TaskDetailPage';
import { SubmitEvidencePage } from './pages/contractor/SubmitEvidencePage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AIModelGovernancePage } from './pages/admin/AIModelGovernancePage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';

// Grievance Redressal
import { GrievancePage } from './pages/grievance/GrievancePage';

// Community Discussions & Public Polling
import { CommunityDiscussionsPage } from './pages/community/CommunityDiscussionsPage';
import { PublicReviewPollingPage } from './pages/community/PublicReviewPollingPage';

import { RoadWatchLogo } from './components/RoadWatchLogo';
import { MapPin, Heart, Shield, Code, Sparkles } from 'lucide-react';

export function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-brand-500 selection:text-white">
          <Navbar />

          <main className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/map" element={<PublicMapPage />} />
              <Route path="/track" element={<ComplaintLookupPage />} />
              <Route path="/stats" element={<PublicStatsPage />} />
              <Route path="/rqi" element={<RoadQualityMapPage />} />

              {/* Auth Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              {/* Citizen Routes */}
              <Route path="/citizen" element={<CitizenDashboard />} />
              <Route path="/report" element={<ReportIssuePage />} />
              <Route path="/complaints/:id" element={<ReportDetailPage />} />
              <Route path="/grievances" element={<GrievancePage />} />
              <Route path="/grievance/new" element={<GrievancePage />} />
              <Route path="/community" element={<CommunityDiscussionsPage />} />
              <Route path="/discussions" element={<CommunityDiscussionsPage />} />
              <Route path="/feedback" element={<PublicReviewPollingPage />} />
              <Route path="/polls" element={<PublicReviewPollingPage />} />

              {/* Authority Routes */}
              <Route path="/authority" element={<AuthorityDashboard />} />
              <Route path="/authority/review-queue" element={<ReviewQueuePage />} />
              <Route path="/authority/review/:id" element={<ComplaintReviewDetailPage />} />
              <Route path="/authority/verification" element={<EvidenceVerificationPage />} />
              <Route path="/authority/rqi" element={<RoadQualityMapPage />} />

              {/* Contractor Routes */}
              <Route path="/contractor" element={<ContractorDashboard />} />
              <Route path="/contractor/tasks/:id" element={<TaskDetailPage />} />
              <Route path="/contractor/submit-evidence/:id" element={<SubmitEvidencePage />} />

              {/* Admin Routes */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/ai-governance" element={<AIModelGovernancePage />} />
              <Route path="/admin/audit-logs" element={<AuditLogsPage />} />

              {/* Catch-all redirect to Home */}
              <Route path="*" element={<LandingPage />} />
            </Routes>
          </main>

          {/* Civic Footer */}
          <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 text-xs">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-white font-bold text-base">
                    <RoadWatchLogo size="sm" />
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    AI-Assisted Geospatial Road Condition Monitoring, Maintenance Management & Public Accountability Platform.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-white font-bold uppercase tracking-wider text-[11px]">Explore</h4>
                  <ul className="space-y-1.5">
                    <li><Link to="/map" className="hover:text-white transition-colors">Live Defect Map</Link></li>
                    <li><Link to="/rqi" className="hover:text-white transition-colors">Road Quality Index (RQI)</Link></li>
                    <li><Link to="/track" className="hover:text-white transition-colors">Public Defect Lookup</Link></li>
                    <li><Link to="/stats" className="hover:text-white transition-colors">Transparency Analytics</Link></li>
                    <li><Link to="/community" className="hover:text-white transition-colors">Discussion Rooms</Link></li>
                    <li><Link to="/feedback" className="hover:text-white transition-colors">Civic Review Polling</Link></li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="text-white font-bold uppercase tracking-wider text-[11px]">Stakeholders</h4>
                  <ul className="space-y-1.5">
                    <li><Link to="/citizen" className="hover:text-white transition-colors">Citizen Reporting Hub</Link></li>
                    <li><Link to="/authority" className="hover:text-white transition-colors">Authority Operations Console</Link></li>
                    <li><Link to="/contractor" className="hover:text-white transition-colors">Contractor Maintenance Hub</Link></li>
                    <li><Link to="/admin" className="hover:text-white transition-colors">Platform Governance</Link></li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="text-white font-bold uppercase tracking-wider text-[11px]">Architecture & Stack</h4>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    React + Vite &bull; Django REST &bull; MongoDB 2dsphere GIS &bull; OpenCV YOLOv8 AI Service &bull; Render Persistent Disk.
                  </p>
                  <div className="pt-2 flex items-center gap-2 text-emerald-400 font-mono text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>System Operational (v2026.11)</span>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500">
                <p>&copy; 2026 RoadWatch Civic Technology Platform. All rights reserved.</p>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    Powered by <Sparkles className="w-3.5 h-3.5 text-sky-400" /> DeepMind Agentic Engineering
                  </span>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
