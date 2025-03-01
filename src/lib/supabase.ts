import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase credentials. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
  );
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  throw new Error(
    'Invalid Supabase URL format. Please check your VITE_SUPABASE_URL in .env file.\n' +
    'URL should be in format: https://your-project-id.supabase.co'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'elearning-auth-storage-key',
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'Content-Type': 'application/json'
    }
  }
});

// Prefetch common data
supabase.from('courses').select('count').limit(1).then(() => {
  console.log('Database connection warmed up');
});

// Debug function to help troubleshoot auth issues
export const checkAuthStatus = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    console.log('Auth Status:', { 
      session: session ? {
        user: session.user,
        expires_at: session.expires_at
      } : null, 
      error 
    });
    return { data: { session }, error };
  } catch (err) {
    console.error('Failed to check auth status:', err);
    return { data: null, error: err };
  }
};

// Test the connection and permissions
export const testConnection = async () => {
  try {
    const { error } = await supabase.from('profiles').select('count').limit(1);
    if (error) {
      console.error('Supabase connection error:', error);
      return false;
    }
    console.log('Supabase connection successful');
    return true;
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return false;
  }
};