import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Clock, Video, Pencil, GraduationCap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

interface Course {
  id: string;
  title: string;
  description: string;
  level: string;
  duration: string;
  instructor_id: string;
  instructor_email: string;
  videoCount: number;
  is_enrolled?: boolean;
}

export function AllCourses() {
  const { user } = useAuthStore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch courses
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select(`
            *,
            videos:course_videos(count)
          `);

        if (coursesError) throw coursesError;

        if (coursesData && user) {
          // Fetch enrollments for current user
          const { data: enrollments, error: enrollmentsError } = await supabase
            .from('enrollments')
            .select('course_id')
            .eq('user_id', user.id);

          if (enrollmentsError) throw enrollmentsError;

          // Create set of enrolled course IDs
          const enrolledCourseIds = new Set(enrollments?.map(e => e.course_id) || []);

          // Get unique instructor IDs
          const instructorIds = [...new Set(coursesData.map(course => course.instructor_id))];
          
          // Fetch instructor emails from auth.users instead of users
          const { data: instructorData, error: instructorError } = await supabase
            .from('profiles')  // Use profiles table instead
            .select('id, email')
            .in('id', instructorIds);

          if (instructorError) {
            console.error('Error fetching instructors:', instructorError);
            throw instructorError;
          }

          // Create a map of instructor IDs to emails
          const instructorEmails = Object.fromEntries(
            (instructorData || []).map(instructor => [instructor.id, instructor.email])
          );

          // Update the transformation to include enrollment status
          const transformedCourses = coursesData.map(course => ({
            ...course,
            instructor_email: instructorEmails[course.instructor_id] || 'Unknown',
            videoCount: course.videos?.[0]?.count || 0,
            is_enrolled: enrolledCourseIds.has(course.id)
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

  const handleEnroll = async (courseId: string) => {
    try {
      if (!user) return;

      setLoading(true);

      // Check if already enrolled
      const { data: existingEnrollment, error: checkError } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows returned
        throw checkError;
      }

      if (existingEnrollment) {
        setError('You are already enrolled in this course');
        return;
      }

      // Create new enrollment - removed enrolled_at field
      const { error: enrollError } = await supabase
        .from('enrollments')
        .insert({
          user_id: user.id,
          course_id: courseId,
          status: 'in_progress',
          progress: 0
        });

      if (enrollError) throw enrollError;

      // Update local state to reflect enrollment
      setCourses(courses.map(course => 
        course.id === courseId 
          ? { ...course, is_enrolled: true }
          : course
      ));

      // Show success message or redirect
      navigate(`/courses/${courseId}`);

    } catch (error) {
      console.error('Error enrolling in course:', error);
      setError(error instanceof Error ? error.message : 'Failed to enroll in course');
    } finally {
      setLoading(false);
    }
  };

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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Available Courses</h1>
        {user?.role === 'instructor' && (
          <Link
            to="/courses/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Create New Course
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <div key={course.id} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">{course.title}</h2>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                  {course.level}
                </span>
              </div>
              
              <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                {course.description}
              </p>

              <div className="mt-4 text-sm text-gray-500">
                <p>Instructor: {course.instructor_email}</p>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center">
                  <Video className="h-5 w-5 mr-1" />
                  <span>{course.videoCount} videos</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 mr-1" />
                  <span>{course.duration || 'Not specified'}</span>
                </div>
              </div>

              <div className="mt-6 flex flex-col space-y-3">
                {user?.id === course.instructor_id && (
                  <div className="flex space-x-3">
                    <Link
                      to={`/courses/${course.id}/edit`}
                      className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit Course
                    </Link>
                    <Link
                      to={`/courses/${course.id}/exam/create`}
                      className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <GraduationCap className="h-4 w-4 mr-2" />
                      Create Exam
                    </Link>
                  </div>
                )}
                {user?.id !== course.instructor_id && user?.role === 'student' && !course.is_enrolled && (
                  <button
                    onClick={() => handleEnroll(course.id)}
                    disabled={loading}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Enrolling...' : 'Enroll Now'}
                  </button>
                )}
                <Link
                  to={`/courses/${course.id}`}
                  className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  {course.is_enrolled ? 'Continue Learning' : 'View Course'}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {courses.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No courses available</h3>
          {user?.role === 'instructor' ? (
            <p className="mt-1 text-sm text-gray-500">Get started by creating your first course.</p>
          ) : (
            <p className="mt-1 text-sm text-gray-500">Check back later for new courses.</p>
          )}
          {user?.role === 'instructor' && (
            <div className="mt-6">
              <Link
                to="/courses/new"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Create New Course
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 