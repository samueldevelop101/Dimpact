import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Users, Video } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

interface Course {
  id: string;
  title: string;
  description: string;
  level: string;
  enrollmentCount: number;
  videoCount: number;
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

export function CourseList() {
  const { user } = useAuthStore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourses = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);

        console.log('Fetching courses for user:', user.id, 'role:', user.role);

        let query = supabase
          .from('courses')
          .select(`
            *,
            enrollments(count),
            course_videos(count)
          `);

        // If user is an instructor, only fetch their courses
        if (user.role === 'instructor') {
          query = query.eq('instructor_id', user.id);
        }

        const { data: coursesData, error: coursesError } = await query;

        if (coursesError) {
          console.error('Error fetching courses:', coursesError);
          throw coursesError;
        }

        if (coursesData) {
          const transformedCourses = coursesData.map(course => ({
            ...course,
            enrollmentCount: course.enrollments?.[0]?.count || 0,
            videoCount: course.course_videos?.[0]?.count || 0
          }));
          
          console.log('Transformed courses:', transformedCourses);
          setCourses(transformedCourses);
        }

      } catch (error) {
        console.error('Error in fetchCourses:', error);
        setError(error instanceof Error ? error.message : 'Failed to load courses');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 max-w-2xl mx-auto">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-2 text-sm text-red-700 hover:text-red-800"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 sm:px-0 mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {user?.role === 'instructor' ? 'Your Courses' : 'Available Courses'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {user?.role === 'instructor' 
              ? 'Manage and monitor your course content'
              : 'Browse and enroll in courses'
            }
          </p>
        </div>
        {user?.role === 'instructor' && (
          <Link
            to="/courses/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Create New Course
          </Link>
        )}
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {user?.role === 'instructor' ? 'No courses created yet' : 'No courses available'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {user?.role === 'instructor' 
              ? 'Get started by creating a new course.'
              : 'Check back later for new courses.'
            }
          </p>
          {user?.role === 'instructor' && (
            <div className="mt-6">
              <Link
                to="/courses/new"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Create Course
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {courses.map((course) => (
              <li key={course.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-indigo-600 truncate">
                        {course.title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {course.description}
                      </p>
                    </div>
                    <div className="flex space-x-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <Users className="flex-shrink-0 mr-1.5 h-5 w-5" />
                        <span>{course.enrollmentCount} students</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Video className="flex-shrink-0 mr-1.5 h-5 w-5" />
                        <span>{course.videoCount} videos</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end space-x-3">
                    <Link
                      to={user.role === 'instructor' ? `/courses/instructor/${course.id}` : `/courses/student/${course.id}`}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      View Course
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}