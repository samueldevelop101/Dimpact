export interface ExamAttempt {
  id: string;
  score: number;
  passed: boolean;
  completed: boolean;
  started_at: string;
  completed_at: string | null;
  exam: {
    id: string;
    title: string;
  };
  user: {
    id: string;
    email: string;
  };
}

export interface AnalyticsData {
  totalAttempts: number;
  passRate: number;
  averageScore: number;
  attempts: ExamAttempt[];
} 