const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

function getToken(): string | null {
  return localStorage.getItem('rw_access_token');
}

export function setTokens(access: string, refresh?: string) {
  localStorage.setItem('rw_access_token', access);
  if (refresh) {
    localStorage.setItem('rw_refresh_token', refresh);
  }
}

export function clearTokens() {
  localStorage.removeItem('rw_access_token');
  localStorage.removeItem('rw_refresh_token');
  localStorage.removeItem('rw_user');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Do not set Content-Type for FormData (browser sets boundary)
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const res = await fetch(url, { ...options, headers });

  if (res.status === 401 && !endpoint.includes('/auth/login')) {
    // If token invalid, clear
    clearTokens();
    window.dispatchEvent(new Event('auth:unauthorized'));
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message || `API error (${res.status})`);
  }

  return json.data !== undefined ? json.data : json;
}

export const api = {
  // Auth
  auth: {
    login: (credentials: { email: string; password: string }) =>
      request<{ user: any; tokens: { access_token: string; refresh_token: string } }>('/auth/login/', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    register: (payload: any) =>
      request<{ user: any; tokens: { access_token: string; refresh_token: string } }>('/auth/register/', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    googleLogin: (payload: { credential?: string; id_token?: string; role?: string }) =>
      request<{ user: any; tokens: { access_token: string; refresh_token: string } }>('/auth/google/', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    me: () => request<any>('/users/me/'),
    logout: () => request<any>('/auth/logout/', { method: 'POST' }),
    requestPasswordReset: (email: string) =>
      request<{ email: string; reset_code?: string; expires_in_minutes: number }>('/auth/password/reset-request/', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    confirmPasswordReset: (payload: { email: string; code: string; new_password: string }) =>
      request<any>('/auth/password/reset-confirm/', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  // Complaints
  complaints: {
    list: (params: Record<string, any> = {}) => {
      const q = new URLSearchParams(params).toString();
      return request<{ items: any[]; total: number }>(`/complaints/${q ? `?${q}` : ''}`);
    },
    get: (id: string) => request<any>(`/complaints/${id}/`),
    create: (formData: FormData) =>
      request<any>('/complaints/', {
        method: 'POST',
        body: formData,
      }),
    support: (id: string) => request<any>(`/complaints/${id}/support/`, { method: 'POST' }),
    removeSupport: (id: string) => request<any>(`/complaints/${id}/support/`, { method: 'DELETE' }),
    review: (id: string, payload: { action: string; reason?: string; severity?: string; category?: string }) =>
      request<any>(`/complaints/${id}/review/`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    reopen: (id: string, reason: string) =>
      request<any>(`/complaints/${id}/reopen/`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    duplicateCandidates: (id: string) => request<any[]>(`/complaints/${id}/duplicate-candidates/`),
    history: (id: string) => request<any[]>(`/complaints/${id}/history/`),
  },

  // Geospatial
  geo: {
    nearby: (lng: number, lat: number, radius = 2000, filters: Record<string, any> = {}) => {
      const q = new URLSearchParams({ lng: String(lng), lat: String(lat), radius: String(radius), ...filters }).toString();
      return request<{ items: any[]; count: number }>(`/geo/complaints/nearby/?${q}`);
    },
    viewport: (minLng: number, minLat: number, maxLng: number, maxLat: number) => {
      const q = new URLSearchParams({
        min_lng: String(minLng),
        min_lat: String(minLat),
        max_lng: String(maxLng),
        max_lat: String(maxLat),
      }).toString();
      return request<{ items: any[]; count: number }>(`/geo/complaints/viewport/?${q}`);
    },
    clusters: () => request<any[]>('/geo/complaints/clusters/'),
    heatmap: () => request<Array<[number, number, number]>>('/geo/complaints/heatmap/'),
    roads: (jurisdictionId?: string) =>
      request<any[]>(`/geo/roads/${jurisdictionId ? `?jurisdiction_id=${jurisdictionId}` : ''}`),
    jurisdictions: () => request<any[]>('/geo/jurisdictions/'),
    roadHistory: (roadId: string) => request<any>(`/geo/roads/${roadId}/history/`),
  },

  // AI & Governance
  ai: {
    reviewPrediction: (predId: string, payload: any) =>
      request<any>(`/ai/predictions/${predId}/review/`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    governance: () => request<any>('/admin/ai-governance/'),
  },

  // Maintenance & Contractor
  maintenance: {
    listTasks: (params: Record<string, any> = {}) => {
      const q = new URLSearchParams(params).toString();
      return request<any[]>(`/maintenance/tasks/${q ? `?${q}` : ''}`);
    },
    createTask: (payload: any) =>
      request<any>('/maintenance/tasks/', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    assignContractor: (taskId: string, contractorOrgId: string) =>
      request<any>(`/maintenance/tasks/${taskId}/assign/`, {
        method: 'POST',
        body: JSON.stringify({ contractor_org_id: contractorOrgId }),
      }),
  },

  contractor: {
    myTasks: (status?: string) =>
      request<any[]>(`/contractor/tasks/${status ? `?status=${status}` : ''}`),
    getTask: (taskId: string) => request<any>(`/contractor/tasks/${taskId}/`),
    acceptTask: (taskId: string) => request<any>(`/contractor/tasks/${taskId}/accept/`, { method: 'POST' }),
    declineTask: (taskId: string, reason: string) =>
      request<any>(`/contractor/tasks/${taskId}/decline/`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    updateProgress: (taskId: string, payload: { progress_percentage: number; note: string; blocker?: string }) =>
      request<any>(`/contractor/tasks/${taskId}/progress/`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    submitEvidence: (taskId: string, formData: FormData) =>
      request<any>(`/contractor/tasks/${taskId}/evidence/`, {
        method: 'POST',
        body: formData,
      }),
  },

  // Verification
  verification: {
    pending: () => request<any[]>('/verification/pending/'),
    approve: (taskId: string, comments: string) =>
      request<any>(`/verification/${taskId}/approve/`, {
        method: 'POST',
        body: JSON.stringify({ comments }),
      }),
    reject: (taskId: string, reason: string) =>
      request<any>(`/verification/${taskId}/reject/`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    citizenFeedback: (taskId: string, payload: { is_fixed: boolean; rating: number; comments: string }) =>
      request<any>(`/verification/${taskId}/citizen-feedback/`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  // Analytics
  analytics: {
    overview: () => request<any>('/analytics/overview/'),
    roads: () => request<any[]>('/analytics/roads/'),
    wards: () => request<any[]>('/analytics/wards/'),
    contractors: () => request<any[]>('/analytics/contractors/'),
    trends: () => request<any[]>('/analytics/trends/'),
  },

  // Admin
  admin: {
    auditLogs: (params: Record<string, any> = {}) => {
      const q = new URLSearchParams(params).toString();
      return request<any[]>(`/admin/audit-logs/${q ? `?${q}` : ''}`);
    },
    organizations: (type?: string) =>
      request<any[]>(`/admin/organizations/${type ? `?type=${type}` : ''}`),
    createOrg: (payload: any) =>
      request<any>('/admin/organizations/', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    verifyOrg: (orgId: string, status: string) =>
      request<any>(`/admin/organizations/${orgId}/verify/`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    settings: () => request<any>('/admin/settings/all/'),
    users: (params: Record<string, any> = {}) => {
      const q = new URLSearchParams(params).toString();
      return request<{ items: any[]; total: number; page: number; page_size: number; stats: any }>(
        `/admin/users/${q ? `?${q}` : ''}`
      );
    },
    updateUserStatus: (userId: string, action: string, payload: Record<string, any> = {}) =>
      request<any>(`/admin/users/${userId}/status/`, {
        method: 'PATCH',
        body: JSON.stringify({ action, ...payload }),
      }),
  },

  // Notifications
  notifications: {
    list: () => request<{ items: any[]; unread_count: number }>('/notifications/'),
    markRead: (id: string) => request<any>(`/notifications/${id}/read/`, { method: 'POST' }),
    readAll: () => request<any>('/notifications/read-all/', { method: 'POST' }),
    broadcast: (payload: {
      target_type: 'GLOBAL' | 'ROLE' | 'USER';
      target_role?: string;
      target_user_id?: string;
      target_email?: string;
      title: string;
      message: string;
      type?: string;
      priority?: string;
    }) =>
      request<any>('/notifications/broadcast/', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  // Grievances
  grievances: {
    list: (params: Record<string, any> = {}) => {
      const q = new URLSearchParams(params).toString();
      return request<{ items: any[]; total: number; stats: any }>(
        `/grievances/${q ? `?${q}` : ''}`
      );
    },
    get: (id: string) => request<any>(`/grievances/${id}/`),
    create: (payload: any) =>
      request<any>('/grievances/', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    updateStatus: (
      id: string,
      payload: { status?: string; remarks?: string; assigned_investigator?: string }
    ) =>
      request<any>(`/grievances/${id}/status/`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
  },
};
