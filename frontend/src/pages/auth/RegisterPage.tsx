import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { GoogleSignInButton } from '../../components/GoogleSignInButton';
import { RoadWatchLogo } from '../../components/RoadWatchLogo';
import {
  MapPin, Lock, Mail, User, Phone, Shield, Wrench, Building2,
  CheckCircle2, Clock, AlertCircle, Briefcase, FileCheck
} from 'lucide-react';

type RegisterRole = 'CITIZEN' | 'AUTHORITY_OFFICER' | 'AUTHORITY_SUPERVISOR' | 'CONTRACTOR_MANAGER';

export const RegisterPage: React.FC = () => {
  const { register, googleLogin } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<RegisterRole>('CITIZEN');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Professional Role Details
  const [department, setDepartment] = useState('Public Works Department (PWD)');
  const [employeeId, setEmployeeId] = useState('');
  const [designation, setDesignation] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingSuccess, setPendingSuccess] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (role === 'AUTHORITY_OFFICER' || role === 'AUTHORITY_SUPERVISOR') {
      if (!employeeId) {
        setError('Official Employee ID / Badge Number is required for authority registration.');
        return;
      }
    }

    if (role === 'CONTRACTOR_MANAGER') {
      if (!companyName) {
        setError('Contractor company / agency name is required.');
        return;
      }
      if (!licenseNumber) {
        setError('Contractor license or registration number is required.');
        return;
      }
    }

    setLoading(true);

    try {
      const payload: any = {
        name,
        email,
        phone,
        password,
        role,
        department,
        employee_id: employeeId,
        designation,
        company_name: companyName,
        license_number: licenseNumber,
        jurisdiction,
      };

      const res = await register(payload);

      if (res.pending_approval) {
        setPendingSuccess({
          role,
          name,
          email,
          org: companyName || department,
          employeeId: employeeId || licenseNumber,
        });
      } else {
        navigate('/citizen');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credential: string) => {
    setError('');
    setLoading(true);
    try {
      await googleLogin(credential, 'CITIZEN');
      navigate('/citizen');
    } catch (err: any) {
      setError(err.message || 'Google sign-up failed.');
    } finally {
      setLoading(false);
    }
  };

  // Pending Approval Success Screen
  if (pendingSuccess) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-6 animate-in fade-in">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold uppercase rounded-full">
              Registration Under Review
            </span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Application Submitted!
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Thank you, <strong className="text-slate-900">{pendingSuccess.name}</strong>. Your registration application as{' '}
              <strong className="text-brand-700">{pendingSuccess.role.replace('_', ' ')}</strong> ({pendingSuccess.org}) has been securely logged.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 text-left text-xs space-y-2 border border-slate-200/70">
            <div className="flex items-center justify-between text-slate-500 pb-1.5 border-b border-slate-200">
              <span>Account Type</span>
              <span className="font-bold text-slate-800">{pendingSuccess.role.replace('_', ' ')}</span>
            </div>
            <div className="flex items-center justify-between text-slate-500 pb-1.5 border-b border-slate-200">
              <span>Organization / Agency</span>
              <span className="font-bold text-slate-800">{pendingSuccess.org}</span>
            </div>
            <div className="flex items-center justify-between text-slate-500 pb-1.5 border-b border-slate-200">
              <span>Registered Email</span>
              <span className="font-mono text-slate-800">{pendingSuccess.email}</span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>Approval Authority</span>
              <span className="font-bold text-brand-700">Authority Supervisor / Admin</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 text-left bg-sky-50 border border-sky-100 p-3 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <span>
              Once an administrator or supervisor verifies your employee ID / contractor credentials, your dashboard access will be activated.
            </span>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Link
              to="/login"
              className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl transition-all shadow-md"
            >
              Back to Sign In
            </Link>
            <Link
              to="/map"
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
            >
              Explore Public Map
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <RoadWatchLogo size="lg" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight pt-1">Create RoadWatch Account</h1>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Choose your account role to join the unified road condition and civic accountability network.
          </p>
        </div>

        {/* Account Role Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => { setRole('CITIZEN'); setError(''); }}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
              role === 'CITIZEN'
                ? 'bg-white text-brand-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Citizen</span>
          </button>

          <button
            type="button"
            onClick={() => { setRole('AUTHORITY_OFFICER'); setError(''); }}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
              role === 'AUTHORITY_OFFICER'
                ? 'bg-white text-brand-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-4 h-4 text-sky-600" />
            <span>PWD Officer</span>
          </button>

          <button
            type="button"
            onClick={() => { setRole('AUTHORITY_SUPERVISOR'); setError(''); }}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
              role === 'AUTHORITY_SUPERVISOR'
                ? 'bg-white text-brand-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span>Supervisor</span>
          </button>

          <button
            type="button"
            onClick={() => { setRole('CONTRACTOR_MANAGER'); setError(''); }}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
              role === 'CONTRACTOR_MANAGER'
                ? 'bg-white text-brand-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wrench className="w-4 h-4 text-amber-600" />
            <span>Contractor</span>
          </button>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Role Approval Notice */}
          {role !== 'CITIZEN' ? (
            <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Verification & Approval Required</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Registrations for <strong>{role.replace('_', ' ')}</strong> are subject to credential approval by an Authority Supervisor or System Administrator.
              </p>
            </div>
          ) : (
            <>
              {/* Google Sign-Up for citizens */}
              <GoogleSignInButton
                onSuccess={handleGoogleSuccess}
                onError={(msg) => setError(msg)}
                text="signup_with"
              />

              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-white px-2 text-slate-400 font-semibold tracking-wider">
                    Or register with email
                  </span>
                </div>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Common fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
              </div>
            </div>

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
                  placeholder={role === 'CITIZEN' ? 'name@example.com' : 'officer@pwd.gov.in'}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
            </div>

            {/* Officer & Supervisor Specific Fields */}
            {(role === 'AUTHORITY_OFFICER' || role === 'AUTHORITY_SUPERVISOR') && (
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Shield className="w-4 h-4 text-brand-600" />
                  <span>Public Works Departmental Credentials</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase">
                      Department / Agency
                    </label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-xl bg-white text-xs outline-none"
                    >
                      <option value="Public Works Department (PWD)">Public Works Department (PWD)</option>
                      <option value="National Highways Authority of India (NHAI)">NHAI (National Highways)</option>
                      <option value="Municipal Corporation (MC)">Municipal Corporation</option>
                      <option value="State Road Development Corp">State Road Development Corp</option>
                      <option value="Smart City SPV">Smart City SPV</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase">
                      Employee / Officer ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      placeholder="e.g. PWD-ENG-8492"
                      className="w-full p-2 border border-slate-300 rounded-xl bg-white text-xs outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase">
                      Official Designation
                    </label>
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="e.g. Assistant Engineer (AE)"
                      className="w-full p-2 border border-slate-300 rounded-xl bg-white text-xs outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase">
                      Jurisdiction / Ward
                    </label>
                    <input
                      type="text"
                      value={jurisdiction}
                      onChange={(e) => setJurisdiction(e.target.value)}
                      placeholder="e.g. Jalandhar City - Zone 2"
                      className="w-full p-2 border border-slate-300 rounded-xl bg-white text-xs outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Contractor Specific Fields */}
            {role === 'CONTRACTOR_MANAGER' && (
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Wrench className="w-4 h-4 text-amber-600" />
                  <span>Contractor & Agency Accreditations</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase">
                      Agency / Company Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Apex Road Infra Ltd"
                      className="w-full p-2 border border-slate-300 rounded-xl bg-white text-xs outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase">
                      Contractor License / Reg # *
                    </label>
                    <input
                      type="text"
                      required
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="e.g. PWD-CL1-2024-991"
                      className="w-full p-2 border border-slate-300 rounded-xl bg-white text-xs outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase">
                      Primary Operating Region / District
                    </label>
                    <input
                      type="text"
                      value={jurisdiction}
                      onChange={(e) => setJurisdiction(e.target.value)}
                      placeholder="e.g. District Jalandhar & Kapurthala Divisions"
                      className="w-full p-2 border border-slate-300 rounded-xl bg-white text-xs outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className={`w-full pl-9 pr-3 py-2 text-xs border rounded-xl focus:ring-2 outline-none ${
                      confirmPassword && confirmPassword !== password
                        ? 'border-rose-300 focus:ring-rose-400 bg-rose-50/30'
                        : 'border-slate-300 focus:ring-brand-500'
                    }`}
                  />
                </div>
              </div>
            </div>

            {confirmPassword && confirmPassword !== password && (
              <p className="text-[11px] text-rose-600 font-semibold">
                ⚠️ Passwords do not match
              </p>
            )}

            <button
              type="submit"
              disabled={loading || (confirmPassword !== '' && confirmPassword !== password)}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-brand-500/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Submitting Registration...</span>
              ) : role === 'CITIZEN' ? (
                <span>Register as Citizen</span>
              ) : (
                <span>Submit {role.replace('_', ' ')} Registration for Approval</span>
              )}
            </button>
          </form>

          <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 font-bold hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
