import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../common/LoadingSpinner';

const ViewCourse = () => {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('courses')
          .select('*, videos:course_videos(*), exams:course_exams(*)')
          .eq('id', id)
          .single();

        if (error) throw error;
        setCourse(data);
      } catch (error) {
        console.error('Error fetching course:', error);
        setError('Failed to load course data');
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [id]);

  if (loading) return <LoadingSpinner size="lg" />;
  if (error) return <div>{error}</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">{course.title}</h1>
      <p className="mb-4">{course.description}</p>
      <img src={course.image_url} alt="Course" className="mb-4" />
      <h2 className="text-xl font-semibold mb-2">Videos</h2>
      <ul className="list-disc pl-5 mb-4">
        {course.videos.map((video: any) => (
          <li key={video.id}>{video.title}</li>
        ))}
      </ul>
      <h2 className="text-xl font-semibold mb-2">Exams</h2>
      <ul className="list-disc pl-5">
        {course.exams.map((exam: any) => (
          <li key={exam.id}>{exam.title}</li>
        ))}
      </ul>
    </div>
  );
};

export default ViewCourse; 