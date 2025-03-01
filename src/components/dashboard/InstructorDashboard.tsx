import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Users, TrendingUp, DollarSign, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

interface DashboardStats {
  totalStudents: number;
  totalCourses: number;
  totalVideos: number;
  averageProgress: number;
}

export const InstructorDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalCourses: 0,
    totalVideos: 0,
    averageProgress: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInstructorData = async () => {
      if (!user) return;
  
      try {
        setLoading(true);
        setError(null);
  
        // First, get the total number of courses
        const { data: coursesCount, error: coursesCountError } = await supabase
          .from('courses')
          .select('*', { count: 'exact' })
          .eq('instructor_id', user.id);
  
        if (coursesCountError) throw coursesCountError;
  
        // Then get the detailed course data
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select(`
            id,
            videos:course_videos(count),
            enrollments:enrollments(count)
          `)
          .eq('instructor_id', user.id);
  
        if (coursesError) throw coursesError;
  
        if (coursesData) {
          const totalStudents = coursesData.reduce((acc, course) => 
            acc + (course.enrollments?.[0]?.count || 0), 0);
          const totalVideos = coursesData.reduce((acc, course) => 
            acc + (course.videos?.[0]?.count || 0), 0);
  
          setStats({
            totalCourses: coursesCount?.length || 0,
            totalStudents,
            totalVideos,
            averageProgress: Math.round((totalStudents > 0 ? 
              (coursesCount?.length / totalStudents) * 100 : 0))
          });
        }
  
      } catch (error) {
        console.error('Error fetching instructor data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
  
    fetchInstructorData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Instructor Dashboard</h1>
          <p className="mt-1 text-gray-600">Manage your courses and track performance</p>
        </div>
        <button onClick={() => navigate('/courses/create')} className="btn btn-primary">
          Create New Course
        </button>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Users className="h-6 w-6 text-indigo-600" />
            <span className="ml-2 text-lg font-medium">Total Students</span>
          </div>
          <p className="mt-2 text-3xl font-bold">{stats.totalStudents}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <BookOpen className="h-6 w-6 text-indigo-600" />
            <span className="ml-2 text-lg font-medium">Active Courses</span>
          </div>
          <p className="mt-2 text-3xl font-bold">{stats.totalCourses}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <TrendingUp className="h-6 w-6 text-indigo-600" />
            <span className="ml-2 text-lg font-medium">Total Videos</span>
          </div>
          <p className="mt-2 text-3xl font-bold">{stats.totalVideos}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <DollarSign className="h-6 w-6 text-indigo-600" />
            <span className="ml-2 text-lg font-medium">Course Progress</span>
          </div>
          <p className="mt-2 text-3xl font-bold">{stats.averageProgress}%</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          to="/courses"
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <h3 className="text-lg font-medium text-gray-900">Manage Courses</h3>
          <p className="mt-2 text-gray-600">View and edit your course content</p>
        </Link>

        <Link
          to="/courses"
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <h3 className="text-lg font-medium text-gray-900">Manage Courses</h3>
          <p className="mt-2 text-gray-600">View and edit your course content</p>
        </Link>
      </div>
    </div>
  );
};