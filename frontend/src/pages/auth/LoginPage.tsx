import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, DEMO_CREDENTIALS } from '../../context/AuthContext';
import { GoogleSignInButton } from '../../components/GoogleSignInButton';
import { RoadWatchLogo } from '../../components/RoadWatchLogo';
import { MapPin, Lock, Mail, ArrowRight, UserCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, googleLogin, quickDemoLogin } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      const userSaved = JSON.parse(localStorage.getItem('rw_user') || '{}');
      if (userSaved.role === 'AUTHORITY_SUPERVISOR') navigate('/supervisor');
      else if (userSaved.role === 'AUTHORITY_OFFICER') navigate('/authority');
      else if (userSaved.role === 'CONTRACTOR_MANAGER' || userSaved.role === 'CONTRACTOR_FIELD') navigate('/contractor');
      else if (userSaved.role === 'SUPER_ADMIN') navigate('/admin');
      else navigate('/citizen');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoClick = async (role: keyof typeof DEMO_CREDENTIALS) => {
    setError('');
    setLoading(true);
    try {
      await quickDemoLogin(role);
      if (role === 'citizen') navigate('/citizen');
      else if (role === 'officer') navigate('/authority');
      else if (role === 'supervisor') navigate('/supervisor');
      else if (role === 'contractor') navigate('/contractor');
      else if (role === 'admin') navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credential: string) => {
    setError('');
    setLoading(true);
    try {
      await googleLogin(credential);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <RoadWatchLogo size="lg" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight pt-1">Sign In to RoadWatch</h1>
          <p className="text-xs text-slate-500">
            Citizen, Authority, Contractor & Administrator Unified Portal
          </p>
        </div>

        {/* Demo Quick Login Pill Box */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
            <UserCheck className="w-4 h-4 text-amber-600" />
            <span>1-Click Evaluator Demo Sign-In:</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleDemoClick('citizen')}
              className="px-2.5 py-1.5 bg-white hover:bg-amber-100/50 border border-amber-200 rounded-lg text-left font-semibold text-slate-800 transition-colors shadow-2xs"
            >
              👩 Priya (Citizen)
            </button>
            <button
              type="button"
              onClick={() => handleDemoClick('officer')}
              className="px-2.5 py-1.5 bg-white hover:bg-amber-100/50 border border-amber-200 rounded-lg text-left font-semibold text-slate-800 transition-colors shadow-2xs"
            >
              👮 Rajesh (PWD Officer)
            </button>
            <button
              type="button"
              onClick={() => handleDemoClick('supervisor')}
              className="px-2.5 py-1.5 bg-white hover:bg-amber-100/50 border border-amber-200 rounded-lg text-left font-semibold text-slate-800 transition-colors shadow-2xs"
            >
              🏢 Ananya (Supervisor)
            </button>
            <button
              type="button"
              onClick={() => handleDemoClick('contractor')}
              className="px-2.5 py-1.5 bg-white hover:bg-amber-100/50 border border-amber-200 rounded-lg text-left font-semibold text-slate-800 transition-colors shadow-2xs"
            >
              👷 Vikram (Contractor)
            </button>
            <button
              type="button"
              onClick={() => handleDemoClick('admin')}
              className="px-2.5 py-1.5 bg-white hover:bg-amber-100/50 border border-amber-200 rounded-lg text-left font-semibold text-slate-800 transition-colors shadow-2xs col-span-2 sm:col-span-1"
            >
              🛡️ Super Admin
            </button>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              {error}
            </div>
          )}

          {/* Google Sign-In */}
          <GoogleSignInButton
            onSuccess={handleGoogleSuccess}
            onError={(msg) => setError(msg)}
            text="continue_with"
          />

          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-white px-2 text-slate-400 font-semibold tracking-wider">
                Or sign in with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@roadwatch.org"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] font-bold text-brand-600 hover:text-brand-700 hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-brand-500/20"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-600 font-bold hover:underline">
              Register as Citizen
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
