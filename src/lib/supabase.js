import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://umhedsctvgxhqgaeasah.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtaGVkc2N0dmd4aHFnYWVhc2FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNDE3ODUsImV4cCI6MjA5MTkxNzc4NX0.uwsV-dODB32piJyDNvyOEZajkLiE1f5hr-3fEgc0VBw';

// Supabase client for DB queries (RPC, select, etc.) — Auth is not used.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

// ---------------------------------------------------------------------------
// Custom session — stores the logged-in user in memory.
// ---------------------------------------------------------------------------
let _currentUser = null;
const _listeners = new Set();

function notifyListeners() {
  _listeners.forEach((fn) => fn(_currentUser));
}

export const auth = {
  // Sign in via public.users table using the login() RPC function
  signInWithPassword: async ({ email, password }) => {
    const { data, error } = await supabase.rpc('login', {
      p_email: email,
      p_password: password,
    });
    if (error) return { error };
    if (data?.error) return { error: new Error(data.error) };
    _currentUser = data;
    notifyListeners();
    return { user: data, error: null };
  },

  signOut: () => {
    _currentUser = null;
    notifyListeners();
  },

  getUser: () => _currentUser,

  // Subscribe to auth state changes. Returns unsubscribe fn.
  onAuthStateChange: (fn) => {
    _listeners.add(fn);
    // Immediately fire with current state
    fn(_currentUser);
    return () => _listeners.delete(fn);
  },
};
