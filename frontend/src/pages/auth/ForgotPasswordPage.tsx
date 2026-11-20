import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { RoadWatchLogo } from '../../components/RoadWatchLogo';
import {
  KeyRound, Mail, Lock, ArrowRight, CheckCircle2,
  AlertCircle, ShieldCheck, ArrowLeft
} from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<'REQUEST' | 'CONFIRM' | 'SUCCESS'>('REQUEST');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [hintCode, setHintCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Request reset code
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.auth.requestPasswordReset(email.trim().toLowerCase());
      if (res.reset_code) {
        setHintCode(res.reset_code);
        setCode(res.reset_code); // Pre-fill for convenience
      }
      setStep('CONFIRM');
    } catch (err: any) {
      setError(err.message || 'Failed to request reset code. Please check the email.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Confirm new password
  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      await api.auth.confirmPasswordReset({
        email: email.trim().toLowerCase(),
        code: code.trim(),
        new_password: newPassword,
      });
      setStep('SUCCESS');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please check the verification code.');
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
          <h1 className="text-2xl font-black text-slate-900 tracking-tight pt-1">
            Account Recovery
          </h1>
          <p className="text-xs text-slate-500">
            Secure password reset for citizen, authority, and contractor accounts
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {step === 'REQUEST' && (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <div className="p-3.5 bg-sky-50/70 border border-sky-200 rounded-2xl text-xs text-sky-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-sky-950">
                  <KeyRound className="w-4 h-4 text-sky-600" />
                  <span>Forgot your password?</span>
                </div>
                <p className="text-[11px] text-sky-800 leading-relaxed">
                  Enter your registered RoadWatch email address. We will issue a secure 6-digit verification code to reset your password.
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@roadwatch.org"
                    className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-brand-500/20 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span>Generating Verification Code...</span>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2 border-t border-slate-100">
                <Link
                  to="/login"
                  className="text-xs font-bold text-slate-600 hover:text-brand-600 inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}

          {step === 'CONFIRM' && (
            <form onSubmit={handleConfirmReset} className="space-y-4">
              {hintCode && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-950">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Verification Code Issued:</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-emerald-800">Your security code:</span>
                    <span className="font-mono text-base font-black px-2.5 py-0.5 bg-white rounded-lg border border-emerald-300 tracking-widest text-emerald-900">
                      {hintCode}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    6-Digit Verification Code *
                  </label>
                  <span className="text-[10px] text-slate-400">Sent to {email}</span>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. 849201"
                    maxLength={6}
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold tracking-widest border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  New Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className={`w-full pl-9 pr-3 py-2 text-xs border rounded-xl focus:ring-2 outline-none ${
                      confirmPassword && confirmPassword !== newPassword
                        ? 'border-rose-300 focus:ring-rose-400 bg-rose-50/20'
                        : 'border-slate-300 focus:ring-brand-500'
                    }`}
                  />
                </div>
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="text-[11px] text-rose-600 font-semibold pt-0.5">
                    ⚠️ Passwords do not match
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || (confirmPassword !== '' && confirmPassword !== newPassword)}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-brand-500/20 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span>Resetting Password...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Reset Password & Sign In</span>
                  </>
                )}
              </button>

              <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep('REQUEST')}
                  className="font-bold text-slate-600 hover:text-brand-600"
                >
                  &larr; Change Email
                </button>
                <Link to="/login" className="font-bold text-slate-600 hover:text-brand-600">
                  Cancel
                </Link>
              </div>
            </form>
          )}

          {step === 'SUCCESS' && (
            <div className="text-center space-y-4 py-2">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900">
                  Password Reset Successfully!
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your new credentials have been securely updated. You can now access your citizen, authority, or contractor workspace.
                </p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl transition-all shadow-md"
              >
                Sign In Now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
