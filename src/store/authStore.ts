import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  role: 'student' | 'instructor';
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  error: null,
  initialized: false,
  
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  
  signIn: async (email, password) => {
    try {
      set({ loading: true, error: null });
      console.log('Attempting sign in for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      if (data.user) {
        await get().refreshUserData();
      }
    } catch (error) {
      console.error('Sign in error:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to sign in',
        user: null 
      });
    } finally {
      set({ loading: false });
    }
  },
  
  signOut: async () => {
    try {
      set({ loading: true, error: null });
      console.log('Signing out...');
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear all state
      set({ 
        user: null,
        error: null,
        loading: false,
        initialized: false
      });
      
      // Clear any local storage data
      localStorage.removeItem('elearning-auth-storage-key');
      
      console.log('Sign out successful');
    } catch (error) {
      console.error('Sign out error:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to sign out',
        loading: false
      });
    }
  },
  
  refreshUserData: async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;
      
      if (session?.user) {
        const userId = session.user.id;
        
        // Get user profile with role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (profileError) {
          console.error('Profile fetch error:', profileError);
          
          // If profile doesn't exist, create it
          if (profileError.code === 'PGRST116') {
            const { data: userData } = await supabase.auth.getUser();
            if (userData?.user) {
              // Get role from user metadata
              const role = (userData.user.user_metadata?.role as 'student' | 'instructor') || 'student';
              
              const { data: newProfile, error: insertError } = await supabase
                .from('profiles')
                .insert({
                  id: userId,
                  email: userData.user.email,
                  role: role,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .select()
                .single();
              
              if (insertError) {
                console.error('Profile creation error:', insertError);
                throw insertError;
              }
              
              set({
                user: {
                  id: userId,
                  email: userData.user.email!,
                  role: role
                }
              });
              return;
            }
          }
          throw profileError;
        }
        
        console.log('Profile data loaded:', profile);
        set({
          user: {
            id: userId,
            email: session.user.email!,
            role: profile.role
          }
        });
      } else {
        set({ user: null });
      }
    } catch (error) {
      console.error('Refresh user data error:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load user data',
        user: null 
      });
    }
  }
}));

// Initialize auth state
export const initializeAuth = async () => {
  console.log('Initializing auth...');
  const store = useAuthStore.getState();
  
  try {
    store.setLoading(true);
    await store.refreshUserData();
  } catch (error) {
    console.error('Auth initialization error:', error);
    store.setError(
      error instanceof Error ? error.message : 'Failed to initialize auth'
    );
  } finally {
    store.setLoading(false);
    useAuthStore.setState({ initialized: true });
  }
};

// Set up auth state change listener
supabase.auth.onAuthStateChange(async (event, session) => {
  console.log('Auth state changed:', event, session?.user?.id);
  
  const store = useAuthStore.getState();
  
  if (['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event) && session) {
    await store.refreshUserData();
  } else if (event === 'SIGNED_OUT') {
    store.setUser(null);
    store.setLoading(false);
    store.setError(null);
  }
});