import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { PlayCircle, BookOpen, Clock, GraduationCap, CheckCircle, ArrowLeft, Video } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface CourseContent {
  id: string;
  title: string;
  description: string;
  videos: {
    id: string;
    title: string;
    youtube_url: string;
    order_index: number;
    completed?: boolean;
  }[];
  instructor: {
    email: string;
  };
  exams: {
    id: string;
    title: string;
    description: string;
    duration: number;
    attempts: {
      completed: boolean;
      passed: boolean;
      score: number;
    }[];
  }[];
}

function getYouTubeVideoId(url: string): string {
  if (url.includes('embed/')) {
    return url.split('embed/')[1];
  }
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match?.[2] ?? '';
}

export function CourseViewer() {
  const { courseId } = useParams();
  console.log('Course ID:', courseId);
  const [course, setCourse] = useState<CourseContent | null>(null);
  const [currentVideo, setCurrentVideo] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) {
        setError('Course ID is missing');
        return;
      }
      
      try {
        setLoading(true);
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .single();

        console.log('Course Data:', courseData);
        console.log('Course Error:', courseError);

        if (courseError) {
          console.error('Error fetching course:', courseError);
          setError('Failed to load course. Please check if the course exists.');
          return;
        }

        if (!courseData) {
          setError('Course not found');
          return;
        }

        // Fetch video completion status for the current user
        if (user) {
          const { data: completedVideos, error: completionError } = await supabase
            .from('video_progress')
            .select('video_id')
            .eq('course_id', courseId)
            .eq('user_id', user.id); // Add user_id filter
        }

        if (completionError) throw completionError;

        // Sort videos by order_index and mark completed ones
        const sortedVideos = [...courseData.videos].sort((a, b) => a.order_index - b.order_index);
        const completedVideoIds = new Set(completedVideos?.map(v => v.video_id) || []);
        
        const videosWithCompletion = sortedVideos.map(video => ({
          ...video,
          completed: completedVideoIds.has(video.id)
        }));

        setCourse({
          ...courseData,
          videos: videosWithCompletion
        });

        // Calculate overall progress
        const totalVideos = videosWithCompletion.length;
        const completedCount = videosWithCompletion.filter(v => v.completed).length;
        const newProgress = totalVideos > 0 ? Math.round((completedCount / totalVideos) * 100) : 0;
        setProgress(newProgress);

        // Update enrollment progress
        await supabase
          .from('enrollments')
          .update({ progress: newProgress })
          .eq('course_id', courseId)
          .eq('user_id', user.id);

      } catch (error) {
        console.error('Error fetching course:', error);
        setError(error instanceof Error ? error.message : 'Failed to load course');
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId, user?.id]);

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

  const handleVideoComplete = async (videoId: string) => {
    if (!user?.id || !courseId) return;

    try {
      const { error } = await supabase
        .from('video_progress')
        .insert({
          video_id: videoId,
          course_id: courseId,
          user_id: user.id,
          completed_at: new Date().toISOString()
        });

      if (error) throw error;

      // Update local state
      setCourse(prev => {
        if (!prev) return null;
        const updatedVideos = prev.videos.map(video =>
          video.id === videoId ? { ...video, completed: true } : video
        );
        return { ...prev, videos: updatedVideos };
      });

      // Calculate and update progress
      const totalVideos = course?.videos.length || 0;
      const completedCount = (course?.videos.filter(v => v.completed).length || 0) + 1;
      const newProgress = Math.round((completedCount / totalVideos) * 100);
      setProgress(newProgress);

      // Update enrollment progress
      await supabase
        .from('enrollments')
        .update({ progress: newProgress })
        .eq('course_id', courseId)
        .eq('user_id', user.id);

    } catch (error) {
      console.error('Error marking video as complete:', error);
    }
  };

  const handleBack = () => {
    navigate('/my-learning');
  };

  const handleVideoClick = (video: any, index: number) => {
    if (user?.role === 'student') {
      setCurrentVideo(index);
    }
  };

  const handleEnroll = async () => {
    if (!user || !courseId) return;

    try {
      setEnrolling(true);
      setEnrollError(null);

      const { error: enrollError } = await supabase
        .from('enrollments')
        .insert({
          user_id: user.id,
          course_id: courseId,
          status: 'in_progress',
          progress: 0
        });

      if (enrollError) throw enrollError;

      setIsEnrolled(true);

    } catch (error) {
      console.error('Error enrolling in course:', error);
      setEnrollError('Failed to enroll in course. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>;
  }

  if (error || !course) {
    return <div className="text-red-600 text-center p-4">{error || 'Course not found'}</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={handleBack}
        className="mb-6 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{course?.title}</h1>
        <p className="mt-2 text-gray-600">{course?.description}</p>
      </div>

      {user?.role === 'instructor' ? (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Course Content</h2>
            {course?.videos.map((video, index) => (
              <div key={video.id} className="border-b pb-4">
                <h3 className="font-medium">{video.title}</h3>
                <p className="text-sm text-gray-500 mt-1">Video {index + 1}</p>
                <div className="mt-2">
                  <a 
                    href={video.youtube_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 text-sm"
                  >
                    View Video Link
                  </a>
                </div>
              </div>
            ))}
            <div className="mt-6">
              <Link
                to={`/courses/${courseId}/edit`}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Edit Course
              </Link>
            </div>
          </div>
        </div>
      ) : (
        isEnrolled ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              {course?.videos && course.videos.length > 0 ? (
                <>
                  <div className="relative" style={{ paddingBottom: '56.25%', height: 0 }}>
                    <iframe
                      src={course.videos[currentVideo].youtube_url}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg"
                    ></iframe>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6 mt-4">
                    <h2 className="text-xl font-bold text-gray-900">
                      {course.videos[currentVideo]?.title}
                    </h2>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        Video {currentVideo + 1} of {course.videos.length}
                      </span>
                      <div className="flex space-x-4">
                        {currentVideo > 0 && (
                          <button
                            onClick={() => setCurrentVideo(currentVideo - 1)}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                          >
                            Previous Video
                          </button>
                        )}
                        <button
                          onClick={() => handleVideoComplete(course.videos[currentVideo].id)}
                          disabled={course.videos[currentVideo]?.completed}
                          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {course.videos[currentVideo]?.completed ? 'Completed' : 'Mark as Complete'}
                        </button>
                        {currentVideo < course.videos.length - 1 && (
                          <button
                            onClick={() => setCurrentVideo(currentVideo + 1)}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                          >
                            Next Video
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-lg shadow p-6 text-center">
                  <Video className="h-12 w-12 text-gray-400 mx-auto" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No videos available</h3>
                  <p className="mt-1 text-sm text-gray-500">Videos will be added soon.</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Course Progress</h3>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-1">{progress}% complete</p>
              </div>

              <h3 className="text-lg font-medium text-gray-900 mb-4">Course Content</h3>
              <div className="space-y-2">
                {course?.videos.map((video, index) => (
                  <button
                    key={video.id}
                    onClick={() => setCurrentVideo(index)}
                    className={`w-full text-left p-4 rounded-lg flex items-center ${
                      currentVideo === index
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                        : 'hover:bg-gray-50'
                    } ${video.completed ? 'bg-green-50' : ''}`}
                  >
                    {currentVideo === index ? (
                      <PlayCircle className="h-5 w-5 mr-3 text-indigo-600" />
                    ) : video.completed ? (
                      <CheckCircle className="h-5 w-5 mr-3 text-green-500" />
                    ) : (
                      <PlayCircle className="h-5 w-5 mr-3 text-gray-400" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{video.title}</p>
                      <p className="text-sm text-gray-500">Video {index + 1}</p>
                    </div>
                  </button>
                ))}
              </div>

              {course?.exams && course.exams.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Course Exam</h3>
                  {course.exams.map(exam => (
                    <div key={exam.id} className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium">{exam.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{exam.description}</p>
                      <div className="mt-4">
                        <Link
                          to={`/courses/${courseId}/exam`}
                          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                          <GraduationCap className="h-4 w-4 mr-2" />
                          Take Exam
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">{course.title}</h3>
            <p className="mt-1 text-sm text-gray-500">Enroll now to start learning</p>
            {enrollError && (
              <p className="mt-2 text-sm text-red-600">{enrollError}</p>
            )}
            <div className="mt-6">
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {enrolling ? 'Enrolling...' : 'Enroll Now'}
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}