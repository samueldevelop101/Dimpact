import { useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { checkAuthStatus } from '../../lib/supabase';

export function RoleCheck() {
  const { user, initialized } = useAuthStore();
  
  useEffect(() => {
    // On mount, check auth status and print user info
    const checkAuth = async () => {
      // Check Supabase auth status
      await checkAuthStatus();
      
      // Print user info from store
      console.log('Current user state:', {
        id: user?.id,
        email: user?.email,
        role: user?.role,
        initialized
      });
    };
    
    checkAuth();
  }, [user, initialized]);
  
  // This is just a debug component - no visible UI
  return null;
} 