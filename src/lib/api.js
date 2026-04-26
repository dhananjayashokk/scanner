import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl
  || process.env.EXPO_PUBLIC_API_URL
  || 'http://localhost:3000';

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

  const res = await fetch(`${API_BASE_URL}${path}`, {
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
      const data = await request('/api/staff/auth', {
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
