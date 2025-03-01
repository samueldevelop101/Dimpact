export interface Course {
  id: string;
  title: string;
  description: string;
  syllabus?: string;
  duration?: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  instructor_id: string;
  created_at: string;
  enrollmentCount?: number;
  videoCount?: number;
} 