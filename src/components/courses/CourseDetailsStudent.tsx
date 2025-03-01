// src/components/courses/CourseDetailsStudent.tsx
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { LoadingSpinner } from '../common/LoadingSpinner';
import './CourseDetails.css'; // Import CSS for styling

interface Lesson {
  id: string;
  title: string;
  duration: string;
  video_url: string; // Add video_url for each lesson
}

interface Course {
  id: string;
  title: string;
  description: string;
  image_url: string;
  video_url: string;
  price: number;
  duration: number;
  level: string;
  category: string;
  lessons: Lesson[]; // Ensure lessons is defined
}

export function CourseDetailsStudent() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<string>(''); // Initialize as an empty string

  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        const { data, error } = await supabase
          .from('courses')
          .select(`
            *,
            lessons (
              id,
              title,
              duration,
              video_url
            )
          `) // Ensure lessons are fetched
          .eq('id', id)
          .single();

        if (error) throw error;
        setCourse(data);
        setCurrentVideo(data.video_url || ''); // Set initial video, default to empty string if undefined

        if (user) {
          const { data: enrollmentData, error: enrollmentError } = await supabase
            .from('enrollments')
            .select('*')
            .eq('user_id', user.id)
            .eq('course_id', id)
            .single();

          if (enrollmentError) throw enrollmentError;
          setIsEnrolled(!!enrollmentData);
        }
      } catch (error) {
        setError((error as any).message);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseData();
  }, [id, user]);

  const handleEnroll = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setEnrolling(true);
    try {
      const { error } = await supabase
        .from('enrollments')
        .insert([{ user_id: user.id, course_id: id }]);

      if (error) throw error;
      setIsEnrolled(true);
    } catch (error) {
      setError((error as any).message);
    } finally {
      setEnrolling(false);
    }
  };

  const handleVideoChange = (videoUrl: string) => {
    setCurrentVideo(videoUrl); // Update the current video
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !course) {
    return <div className="error-message">Error: {error || 'Course not found'}</div>;
  }

  return (
    <div className="course-details">
      <div className="main-video-container">
        <h1 className="course-title">{course.title}</h1>
        <div className="video-container">
          <video className="course-video" controls>
            <source src={currentVideo} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
        <p className="course-description">{course.description}</p>
        <div className="course-info">
          <p><strong>Price:</strong> ${course.price}</p>
          <p><strong>Duration:</strong> {course.duration} hours</p>
          <p><strong>Level:</strong> {course.level}</p>
          <p><strong>Category:</strong> {course.category}</p>
        </div>

        <h2>All Lessons</h2>
        <div className="lessons-list">
          {course.lessons && course.lessons.length > 0 ? (
            course.lessons.map((lesson) => (
              <div key={lesson.id} className="lesson-item">
                <Link to="#" className="lesson-link" onClick={() => handleVideoChange(lesson.video_url)}>
                  {lesson.title} - {lesson.duration}
                </Link>
              </div>
            ))
          ) : (
            <p>No lessons available for this course.</p>
          )}
        </div>

        {!isEnrolled && (
          <button className="enroll-button" onClick={handleEnroll} disabled={enrolling}>
            {enrolling ? <LoadingSpinner /> : 'Enroll Now'}
          </button>
        )}
      </div>

      <div className="sidebar">
        <h2>Additional Videos</h2>
        <div className="additional-videos">
          {course.lessons.map((lesson) => (
            <div key={lesson.id} className="additional-video-item">
              <Link to="#" onClick={() => handleVideoChange(lesson.video_url)}>
                {lesson.title}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}