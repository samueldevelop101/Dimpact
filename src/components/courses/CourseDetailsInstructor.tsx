// src/components/courses/CourseDetailsInstructor.tsx
import React from 'react';
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { LoadingSpinner } from '../common/LoadingSpinner';
import './CourseDetailsInstructor.css'; // Import the new CSS for instructor styling

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
  lessons: Lesson[];
  videos: { id: string; title: string; video_url: string }[];
}

export function CourseDetailsInstructor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            ),
            course_videos (
              id,
              video_url
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        setCourse(data);
      } catch (error) {
        setError((error as any).message);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseData();
  }, [id]);

  const handleDelete = async () => {
    const confirmDelete = window.confirm("Are you sure you want to delete this course?");
    if (confirmDelete) {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', id);

      if (error) {
        setError(error.message);
      } else {
        navigate('/courses'); // Use navigate instead of history.push
      }
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !course) {
    return <div className="instructor-error-message">Error: {error || 'Course not found'}</div>;
  }

  return (
    <div className="course-details-instructor">
      <div className="instructor-main-video-container">
        <h1 className="instructor-course-title">{course.title}</h1>
        <div className="instructor-video-container">
          <video className="instructor-course-video" controls>
            <source src={course.video_url} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
        <p className="instructor-course-description">{course.description}</p>
        <div className="instructor-course-info">
          <p><strong>Price:</strong> ${course.price}</p>
          <p><strong>Duration:</strong> {course.duration} hours</p>
          <p><strong>Level:</strong> {course.level}</p>
          <p><strong>Category:</strong> {course.category}</p>
        </div>

        <h2>All Lessons</h2>
        <div className="instructor-lessons-list">
          {course.lessons && course.lessons.length > 0 ? (
            course.lessons.map((lesson) => (
              <div key={lesson.id} className="instructor-lesson-item">
                <Link to={`/lessons/${lesson.id}`} className="instructor-lesson-link">
                  {lesson.title} - {lesson.duration}
                </Link>
              </div>
            ))
          ) : (
            <p>No lessons available for this course.</p>
          )}
        </div>

        <h2>Course Videos</h2>
        <div className="course-videos">
          {course.videos && course.videos.length > 0 ? (
            course.videos.map((video) => (
              <div key={video.id}>
                <iframe
                  width="560"
                  height="315"
                  src={video.video_url.replace("watch?v=", "embed/")} // Convert to embed URL
                  title={video.title}
                  frameBorder="0"
                  allowFullScreen
                ></iframe>
              </div>
            ))
          ) : (
            <p>No videos available for this course.</p>
          )}
        </div>

        <div className="instructor-actions">
          <Link to={`/edit-course/${course.id}`} className="edit-course-button">Edit Course</Link>
          <button onClick={handleDelete} className="delete-course-button">Delete Course</button>
        </div>
      </div>

      <div className="sidebar">
        <h2>Additional Videos</h2>
        <div className="instructor-additional-videos">
          {course.lessons.map((lesson) => (
            <div key={lesson.id} className="instructor-additional-video-item">
              <Link to={`/lessons/${lesson.id}`} className="instructor-additional-video-link">
                {lesson.title}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}