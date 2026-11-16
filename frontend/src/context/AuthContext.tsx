import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api, setTokens, clearTokens } from '../api/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (payload: any) => Promise<void>;
  logout: () => void;
  quickDemoLogin: (role: 'citizen' | 'officer' | 'supervisor' | 'contractor' | 'admin') => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_CREDENTIALS = {
  citizen: { email: 'citizen@roadwatch.org', pass: 'Citizen123!', label: 'Citizen (Priya)' },
  officer: { email: 'officer@roadwatch.org', pass: 'Officer123!', label: 'Authority Officer (Rajesh)' },
  supervisor: { email: 'supervisor@roadwatch.org', pass: 'Supervisor123!', label: 'Authority Supervisor (Ananya)' },
  contractor: { email: 'contractor@roadwatch.org', pass: 'Contractor123!', label: 'Contractor Manager (Vikram)' },
  admin: { email: 'admin@roadwatch.org', pass: 'Admin123!', label: 'Super Admin' },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('rw_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('rw_access_token');
      if (token) {
        try {
          const profile = await api.auth.me();
          setUser(profile);
          localStorage.setItem('rw_user', JSON.stringify(profile));
        } catch {
          clearTokens();
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkAuth();

    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.auth.login({ email, password: pass });
    setTokens(res.tokens.access_token, res.tokens.refresh_token);
    setUser(res.user);
    localStorage.setItem('rw_user', JSON.stringify(res.user));
  };

  const register = async (payload: any) => {
    const res = await api.auth.register(payload);
    setTokens(res.tokens.access_token, res.tokens.refresh_token);
    setUser(res.user);
    localStorage.setItem('rw_user', JSON.stringify(res.user));
  };

  const logout = () => {
    api.auth.logout().catch(() => {});
    clearTokens();
    setUser(null);
  };

  const quickDemoLogin = async (role: keyof typeof DEMO_CREDENTIALS) => {
    const cred = DEMO_CREDENTIALS[role];
    await login(cred.email, cred.pass);
  };

  const hasRole = (...roles: UserRole[]): boolean => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN' || user.roles?.includes('SUPER_ADMIN')) return true;
    return roles.some((r) => user.role === r || user.roles?.includes(r));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, quickDemoLogin, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
