import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export function InstructorCheck({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role !== 'instructor') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  if (!user || user.role !== 'instructor') {
    return null;
  }

  return <>{children}</>;
} 