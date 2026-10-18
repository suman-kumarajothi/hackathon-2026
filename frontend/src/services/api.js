// =============================================================================
// CMS Frontend API Client — Single Origin & Proxied Telemetry
// =============================================================================
// All requests use relative URLs (/api/v1/...) ensuring seamless operation:
//   - Localhost Development (proxied via Vite server to port 8080)
//   - Cloudflare Quick Tunnel (proxied via Vite server through single public HTTPS URL)
//   - Docker / Production (proxied via Nginx reverse proxy to backend:8080)
//
// Token-based authentication with PBKDF2 password hashing & RBAC.
// =============================================================================

const API_BASE = '/api/v1';

function getToken() {
  return localStorage.getItem('cms_auth_token') || '';
}

async function fetchJson(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = new Error(data.error || `API HTTP ${res.status}: ${res.statusText}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  } catch (err) {
    console.warn(`[CMS API] Fetch failed for ${url}:`, err.message);
    throw err;
  }
}

export const ApiService = {
  // System Health
  checkHealth: async () => {
    const res = await fetch('/actuator/health');
    return res.json();
  },

  // Authentication
  login: async (username, password) => {
    const data = await fetchJson('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (data.token) {
      localStorage.setItem('cms_auth_token', data.token);
    }
    return data;
  },

  changePassword: async (currentPassword, newPassword) => {
    return fetchJson('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  getMe: async () => {
    return fetchJson('/auth/me');
  },

  logout: async () => {
    try {
      await fetchJson('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('cms_auth_token');
    }
  },

  // User Management (Admin Only)
  getUsers: () => fetchJson('/users'),
  createUser: (userData) => fetchJson('/users', { method: 'POST', body: JSON.stringify(userData) }),
  updateUser: (username, userData) => fetchJson(`/users/${encodeURIComponent(username)}`, { method: 'PUT', body: JSON.stringify(userData) }),
  deleteUser: (username) => fetchJson(`/users/${encodeURIComponent(username)}`, { method: 'DELETE' }),
  resetPassword: (username, newPassword) => fetchJson(`/users/${encodeURIComponent(username)}/reset-password`, { method: 'POST', body: JSON.stringify({ newPassword }) }),

  // Geographic Hierarchy
  getRegions: () => fetchJson('/regions'),
  getZones: (regionId) => fetchJson(`/regions/${encodeURIComponent(regionId)}/zones`),

  // Smart Lamp Device Management
  getDevices: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchJson(`/devices${qs ? `?${qs}` : ''}`);
  },
  createDevice: (deviceData) => fetchJson('/devices', { method: 'POST', body: JSON.stringify(deviceData) }),
  getDevice: (id) => fetchJson(`/devices/${encodeURIComponent(id)}`),
  getDeviceTelemetrySeries: (id, range = 'day') => fetchJson(`/devices/${encodeURIComponent(id)}/telemetry?range=${encodeURIComponent(range)}`),
  updateDevice: (id, data) => fetchJson(`/devices/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Operational Modules
  getSchedules: () => fetchJson('/schedules'),
  createSchedule: (data) => fetchJson('/schedules', { method: 'POST', body: JSON.stringify(data) }),
  updateSchedule: (id, data) => fetchJson(`/schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSchedule: (id) => fetchJson(`/schedules/${id}`, { method: 'DELETE' }),
  generateSchedule: (data) => fetchJson('/schedules/generate', { method: 'POST', body: JSON.stringify(data) }),
  deploySchedule: (id) => fetchJson(`/schedules/${id}/deploy`, { method: 'POST' }),

  evaluateSite: (params) => fetchJson('/deployment/evaluate', { method: 'POST', body: JSON.stringify(params) }),
  getEvaluationHistory: () => fetchJson('/deployment/history'),

  getAtRiskDevices: () => fetchJson('/forecast/devices'),
  getDeviceTelemetry: (id) => fetchJson(`/forecast/devices/${id}/telemetry`),

  // Diagnostics & AI Voice Assistant
  chatTroubleshoot: (data) => fetchJson('/troubleshoot/chat', { method: 'POST', body: JSON.stringify(data) }),
  startTroubleshoot: (data) => fetchJson('/troubleshoot/start', { method: 'POST', body: JSON.stringify(data) }),
  submitTroubleshootStep: (data) => fetchJson('/troubleshoot/step', { method: 'POST', body: JSON.stringify(data) }),
  resolveDeviceIssue: (id, data = {}) => fetchJson(`/devices/${encodeURIComponent(id)}/resolve`, { method: 'POST', body: JSON.stringify(data) }),
  createSupportTicket: (ticketData) => fetchJson('/troubleshoot/ticket', { method: 'POST', body: JSON.stringify(ticketData) }),
};
