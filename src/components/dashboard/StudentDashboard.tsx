import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Award, BarChart, Video, Clock, GraduationCap, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface Video {
  id: string;
  title: string;
  youtube_url: string;
  order_index: number;
}

interface Exam {
  id: string;
  title: string;
  description: string;
  questions: any[];
}

interface Course {
  id: string;
  title: string;
  description: string;
  level: string;
  duration: number;
  videos: Video[];
  exams: Exam[];
}

interface Statistics {
  totalEnrollments: number;
  completedCourses: number;
  certificatesEarned: number;
  averageProgress: number;
}

interface Enrollment {
  id: string;
  course: {
    id: string;
    title: string;
    description: string;
    image_url: string;
  };
  progress: number;
  last_accessed: string;
  completed: boolean;
  certificate_issued: boolean;
}

export function StudentDashboard() {
  const { user } = useAuthStore();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    totalEnrollments: 0,
    completedCourses: 0,
    certificatesEarned: 0,
    averageProgress: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching enrollments for user:', user?.id);

      // First, check if the enrollments table exists and we have access
      const { data: tableInfo, error: tableError } = await supabase
        .from('enrollments')
        .select('count')
        .limit(1);

      if (tableError) {
        console.error('Table check error:', tableError);
        throw new Error(`Database table check failed: ${tableError.message}`);
      }

      // Fetch enrollments with course details
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select(`
          id,
          user_id,
          course_id,
          progress,
          last_accessed,
          completed,
          certificate_issued,
          course:courses (
            id,
            title,
            description,
            image_url
          )
        `)
        .eq('user_id', user!.id);

      if (enrollmentsError) {
        console.error('Enrollments fetch error:', enrollmentsError);
        throw enrollmentsError;
      }

      console.log('Fetched enrollments:', enrollmentsData);

      const enrollments = enrollmentsData || [];
      setEnrollments(enrollments);

      // Calculate statistics
      const stats: Statistics = {
        totalEnrollments: enrollments.length,
        completedCourses: enrollments.filter(e => e.completed).length,
        certificatesEarned: enrollments.filter(e => e.certificate_issued).length,
        averageProgress: enrollments.length > 0
          ? Math.round(enrollments.reduce((acc, curr) => acc + (curr.progress || 0), 0) / enrollments.length)
          : 0
      };

      console.log('Calculated statistics:', stats);
      setStatistics(stats);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(
        err instanceof Error 
          ? `Error: ${err.message}. Please contact support if this persists.` 
          : 'Failed to fetch dashboard data. Please try again later.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Dashboard Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={fetchDashboardData}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
            <Link
              to="/courses"
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Browse Courses
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
        <Link
          to="/courses"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Browse More Courses
        </Link>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-500">Enrolled Courses</div>
            <BookOpen className="h-5 w-5 text-blue-500" />
          </div>
          <div className="flex items-baseline">
            <div className="text-3xl font-semibold text-gray-900">{statistics.totalEnrollments}</div>
            <div className="text-sm text-gray-500 ml-2">courses</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-500">Completed</div>
            <GraduationCap className="h-5 w-5 text-green-500" />
          </div>
          <div className="flex items-baseline">
            <div className="text-3xl font-semibold text-gray-900">{statistics.completedCourses}</div>
            <div className="text-sm text-gray-500 ml-2">courses</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-500">Certificates</div>
            <Award className="h-5 w-5 text-yellow-500" />
          </div>
          <div className="flex items-baseline">
            <div className="text-3xl font-semibold text-gray-900">{statistics.certificatesEarned}</div>
            <div className="text-sm text-gray-500 ml-2">earned</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-500">Average Progress</div>
            <BarChart className="h-5 w-5 text-purple-500" />
          </div>
          <div className="flex items-baseline">
            <div className="text-3xl font-semibold text-gray-900">{statistics.averageProgress}%</div>
            <div className="text-sm text-gray-500 ml-2">completed</div>
          </div>
        </div>
      </div>

      {/* Course Progress Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Learning Progress</h2>
          {enrollments.length === 0 ? (
            <div className="text-center py-8">
              <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">You haven't enrolled in any courses yet.</p>
              <Link
                to="/courses"
                className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Browse Courses
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {enrollments.map((enrollment) => (
                <div key={enrollment.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start">
                    <img
                      src={enrollment.course.image_url || 'https://via.placeholder.com/150'}
                      alt={enrollment.course.title}
                      className="w-24 h-24 object-cover rounded"
                    />
                    <div className="ml-4 flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="text-lg font-medium text-gray-900">
                          <Link to={`/courses/student/${enrollment.course.id}`} className="hover:text-blue-600">
                            {enrollment.course.title}
                          </Link>
                        </h3>
                        <div className="flex items-center space-x-2">
                          {enrollment.completed && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <GraduationCap className="h-4 w-4 mr-1" />
                              Completed
                            </span>
                          )}
                          {enrollment.certificate_issued && (
                            <Link
                              to={`/certificates/${enrollment.id}`}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                            >
                              <Award className="h-4 w-4 mr-1" />
                              Certificate
                            </Link>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">{enrollment.course.description}</p>
                      <div className="flex items-center mb-2">
                        <div className="flex-1">
                          <div className="h-2 bg-gray-200 rounded-full">
                            <div
                              className="h-2 bg-blue-600 rounded-full transition-all duration-300"
                              style={{ width: `${enrollment.progress}%` }}
                            />
                          </div>
                        </div>
                        <span className="ml-2 text-sm font-medium text-gray-900">{enrollment.progress}%</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="h-4 w-4 mr-1" />
                        Last accessed: {new Date(enrollment.last_accessed).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}