import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl
  || process.env.EXPO_PUBLIC_API_URL
  || 'http://localhost:3000';

// Accept the base URL with or without a trailing /api, and prefix /api to bare paths
// (e.g. '/onboard/organizations'), so every call lands on a Next.js API route.
const API_ROOT = API_BASE_URL.replace(/\/+$/, '').replace(/\/api$/, '');
const buildUrl = (path) => `${API_ROOT}${path.startsWith('/api/') ? path : `/api${path}`}`;

// ---------------------------------------------------------------------------
// In-memory session
// ---------------------------------------------------------------------------
let _currentUser = null;
const _listeners = new Set();

function notifyListeners() {
  _listeners.forEach((fn) => fn(_currentUser));
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------
async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(buildUrl(path), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return data;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const auth = {
  signInWithPassword: async ({ email, password }) => {
    try {
      const data = await request('/staff/auth', {
        method: 'POST',
        body: { email, password },
      });
      _currentUser = { ...data.user, token: data.token };
      notifyListeners();
      return { user: _currentUser, error: null };
    } catch (err) {
      return { user: null, error: err };
    }
  },

  requestOtp: async ({ phone }) => {
    try {
      await request('/api/gogenie/auth/request-otp', {
        method: 'POST',
        body: { phone },
      });
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  },

  getQuickAccessAccounts: async () => {
    try {
      const data = await request('/api/gogenie/auth/demo-accounts');
      return { accounts: data.accounts || [], error: null };
    } catch (err) {
      return { accounts: [], error: err };
    }
  },

  verifyOtp: async ({ phone, otp }) => {
    try {
      const data = await request('/api/gogenie/auth/verify-otp', {
        method: 'POST',
        body: { phone, otp },
      });
      if (data.user?.role === 'gogenie_delivery') {
        throw new Error('Delivery agents should use the GoGenie Delivery app');
      }
      _currentUser = { ...data.user, token: data.token };
      notifyListeners();
      return { user: _currentUser, error: null };
    } catch (err) {
      return { user: null, error: err };
    }
  },

  signOut: () => {
    _currentUser = null;
    notifyListeners();
  },

  getUser: () => _currentUser,

  onAuthStateChange: (fn) => {
    _listeners.add(fn);
    fn(_currentUser);
    return () => _listeners.delete(fn);
  },
};

// ---------------------------------------------------------------------------
// Authenticated request shorthand
// ---------------------------------------------------------------------------
export function apiRequest(path, options = {}) {
  const token = _currentUser?.token;
  return request(path, { ...options, token });
}
