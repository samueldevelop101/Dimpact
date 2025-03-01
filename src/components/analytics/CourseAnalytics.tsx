import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { AnalyticsData } from '../../types/exam';

export function CourseAnalytics() {
  const { courseId } = useParams<{ courseId: string }>();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const abortController = new AbortController();

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        // Parallel requests for better performance
        const [examAttemptsResponse, examStatsResponse] = await Promise.all([
          supabase
            .from('exam_attempts')
            .select(`
              id,
              score,
              passed,
              completed,
              started_at,
              completed_at,
              exam:course_exams!inner(
                id,
                title
              )
            `)
            .eq('exam.course_id', courseId)
            .order('created_at', { ascending: false })
            .limit(10), // Limit to recent attempts

          supabase
            .rpc('get_course_exam_stats', { course_id: courseId })
        ]);

        if (!mounted) return;

        if (examAttemptsResponse.error) throw examAttemptsResponse.error;
        if (examStatsResponse.error) throw examStatsResponse.error;

        const analytics = {
          totalAttempts: examStatsResponse.data?.total_attempts || 0,
          passRate: examStatsResponse.data?.pass_rate || 0,
          averageScore: examStatsResponse.data?.average_score || 0,
          attempts: examAttemptsResponse.data || []
        };

        setAnalyticsData(analytics);
      } catch (error) {
        console.error('Error fetching analytics:', error);
        if (mounted) {
          setError(error instanceof Error ? error.message : 'Failed to fetch analytics');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchAnalytics();

    return () => {
      mounted = false;
      abortController.abort();
    };
  }, [courseId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse bg-gray-200 h-8 w-1/4 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-lg shadow animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg shadow animate-pulse">
          <div className="p-4">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-3 py-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Rest of your component...
} 