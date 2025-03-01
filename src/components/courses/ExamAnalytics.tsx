import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { BarChart, Users, Award, AlertTriangle } from 'lucide-react';

interface ExamAnalytics {
  totalAttempts: number;
  averageScore: number;
  passRate: number;
  questionAnalytics: {
    questionIndex: number;
    correctRate: number;
  }[];
}

interface StudentAttempt {
  user: {
    email: string;
  };
  score: number;
  passed: boolean;
  created_at: string;
}

export const ExamAnalytics: React.FC = () => {
  const { courseId } = useParams();
  const [analytics, setAnalytics] = useState<ExamAnalytics | null>(null);
  const [recentAttempts, setRecentAttempts] = useState<StudentAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Fetch exam attempts
        const { data: attempts, error: attemptsError } = await supabase
          .from('exam_attempts')
          .select(`
            score,
            passed,
            answers,
            created_at,
            user:profiles (email)
          `)
          .eq('exam_id', courseId)
          .order('created_at', { ascending: false });

        if (attemptsError) throw attemptsError;

        // Calculate analytics
        const totalAttempts = attempts.length;
        const averageScore = attempts.reduce((acc, curr) => acc + curr.score, 0) / totalAttempts;
        const passRate = (attempts.filter(a => a.passed).length / totalAttempts) * 100;

        // Question analytics
        const questionAnalytics = attempts[0]?.answers.map((_, qIndex) => ({
          questionIndex: qIndex,
          correctRate: (attempts.filter(a => a.answers[qIndex] === a.answers[qIndex]).length / totalAttempts) * 100
        }));

        setAnalytics({
          totalAttempts,
          averageScore,
          passRate,
          questionAnalytics
        });

        setRecentAttempts(attempts.slice(0, 5));
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [courseId]);

  if (loading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  if (!analytics) {
    return <div className="text-center py-8">No exam data available.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto py-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Users className="h-6 w-6 text-indigo-600" />
            <span className="ml-2 text-lg font-medium">Total Attempts</span>
          </div>
          <p className="mt-2 text-3xl font-bold">{analytics.totalAttempts}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <BarChart className="h-6 w-6 text-indigo-600" />
            <span className="ml-2 text-lg font-medium">Average Score</span>
          </div>
          <p className="mt-2 text-3xl font-bold">{analytics.averageScore.toFixed(1)}%</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Award className="h-6 w-6 text-indigo-600" />
            <span className="ml-2 text-lg font-medium">Pass Rate</span>
          </div>
          <p className="mt-2 text-3xl font-bold">{analytics.passRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* Question Analysis */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-6">
          <h2 className="text-lg font-medium mb-4">Question Analysis</h2>
          <div className="space-y-4">
            {analytics.questionAnalytics.map((q) => (
              <div key={q.questionIndex} className="flex items-center">
                <span className="w-32">Question {q.questionIndex + 1}</span>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded-full">
                    <div
                      className="h-4 bg-indigo-600 rounded-full"
                      style={{ width: `${q.correctRate}%` }}
                    />
                  </div>
                </div>
                <span className="ml-4 w-16 text-right">{q.correctRate.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Attempts */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-lg font-medium mb-4">Recent Attempts</h2>
          <div className="space-y-4">
            {recentAttempts.map((attempt, index) => (
              <div key={index} className="flex items-center justify-between p-4 border-b">
                <div>
                  <p className="font-medium">{attempt.user.email}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(attempt.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center">
                  <span className="mr-4">{attempt.score}%</span>
                  {attempt.passed ? (
                    <Award className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}; 