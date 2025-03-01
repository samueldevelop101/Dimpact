import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BookOpen, Clock, Users, Video, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'react-hot-toast';

interface CourseDetails {
  id: string;
  title: string;
  description: string;
  syllabus: string;
  duration: string;
  level: string;
  instructor_id: string;
  videos: {
    id: string;
    title: string;
    youtube_url: string;
    order_index: number;
  }[];
  enrollmentCount: number;
}

export function CourseView() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) return;

      try {
        setLoading(true);
        setError(null);

        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select(`*, videos:course_videos(*)`)
          .eq('id', courseId)
          .single();

        if (courseError) throw courseError;

        setCourse(courseData);
      } catch (error) {
        console.error('Error fetching course:', error);
        setError(error instanceof Error ? error.message : 'Failed to load course');
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId]);

  useEffect(() => {
    const checkEnrollment = async () => {
      if (!user || !courseId) return;

      const { data } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .single();

      setIsEnrolled(!!data);
    };

    checkEnrollment();
  }, [courseId, user]);

  const handleEnroll = async () => {
    if (!user || !courseId) return;

    try {
      const { error } = await supabase
        .from('enrollments')
        .insert({
          user_id: user.id,
          course_id: courseId,
          status: 'in_progress',
          progress: 0
        });

      if (error) throw error;

      setIsEnrolled(true);
      toast.success('Successfully enrolled in the course!');
    } catch (error) {
      console.error('Error enrolling in course:', error);
      toast.error('Failed to enroll in course. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded relative">
          {error || 'Course not found'}
        </div>
      </div>
    );
  }

  const isStudent = user?.role === 'student';
  console.log('Is Student:', isStudent);
  console.log('Is Enrolled:', isEnrolled);

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <button
          onClick={() => navigate('/courses')}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Courses
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
          <p className="mt-1 text-sm text-gray-500">{course.description}</p>
        </div>

        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex items-center text-sm text-gray-500">
              <Clock className="flex-shrink-0 mr-1.5 h-5 w-5" />
              <span>{course.duration || 'Duration not specified'}</span>
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <BookOpen className="flex-shrink-0 mr-1.5 h-5 w-5" />
              <span>Level: {course.level}</span>
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <Users className="flex-shrink-0 mr-1.5 h-5 w-5" />
              <span>{course.enrollmentCount} enrolled</span>
            </div>
          </div>
        </div>

        {course.syllabus && (
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <h3 className="text-lg font-medium text-gray-900">Syllabus</h3>
            <div className="mt-2 text-sm text-gray-500">{course.syllabus}</div>
          </div>
        )}

        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium text-gray-900">Course Content</h3>
          <div className="mt-4 space-y-4">
            {course.videos.length > 0 ? (
              course.videos
                .sort((a, b) => a.order_index - b.order_index)
                .map((video) => (
                  <div
                    key={video.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center">
                      <Video className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-sm font-medium text-gray-900">
                        {video.title}
                      </span>
                    </div>
                  </div>
                ))
            ) : (
              <p className="text-sm text-gray-500">No videos available</p>
            )}
          </div>
        </div>

        {isStudent && !isEnrolled && (
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <button
              onClick={handleEnroll}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Enroll Now
            </button>
          </div>
        )}

        {user?.id === course.instructor_id && (
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <div className="flex justify-end space-x-3">
              <Link
                to={`/courses/${course.id}/edit`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Edit Course
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 