export interface User {
  id: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  created_at: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}