// src/components/courses/EditCourse.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface Course {
  id: string;
  title: string;
  description: string;
  image_url: string;
  video_url: string; // This can be the main video URL
  price: number;
  duration: number;
  level: string;
  category: string;
}

export function EditCourse() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Course | null>(null);
  const [videoData, setVideoData] = useState<{ title: string; url: string; order_index: number }[]>([{ title: '', url: '', order_index: 1 }]);

  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setCourse(data);
        setFormData(data);
        
        // Fetch associated video URLs
        const { data: videos } = await supabase
          .from('course_videos')
          .select('title, video_url, order_index')
          .eq('course_id', id)
          .order('order_index');

        setVideoData(videos?.map(video => ({ 
          title: video.title, 
          url: video.video_url,
          order_index: video.order_index 
        })) || [{ title: '', url: '', order_index: 1 }]);
      } catch (error) {
        setError((error as any).message);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseData();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (formData) {
      setFormData((prevData: Course | null) => {
        if (!prevData) return null;
        return {
          ...prevData,
          [name]: value
        } as Course;
      });
    }
  };

  const handleVideoChange = (index: number, field: 'title' | 'url', value: string) => {
    const updatedVideos = [...videoData];
    updatedVideos[index] = { ...updatedVideos[index], [field]: value };
    setVideoData(updatedVideos);
  };

  const addVideoUrl = () => {
    const newIndex = videoData.length + 1;
    console.log('Adding new video with index:', newIndex);
    setVideoData([...videoData, { 
      title: '', 
      url: '', 
      order_index: newIndex
    }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) {
      console.error('Form data is null');
      return;
    }

    try {
      // First update the course
      const { error: courseError } = await supabase
        .from('courses')
        .update(formData)
        .eq('id', id);

      if (courseError) {
        console.error('Error updating course:', courseError);
        throw courseError;
      }

      console.log('Course updated successfully');

      // Clear existing videos
      const { error: deleteError } = await supabase
        .from('course_videos')
        .delete()
        .eq('course_id', id);

      if (deleteError) {
        console.error('Error deleting existing videos:', deleteError);
        throw deleteError;
      }

      console.log('Existing videos deleted successfully');

      // Filter and prepare video data
      const validVideoData = videoData
        .filter(video => video.url.trim() !== '' && video.title.trim() !== '')
        .map((video, index) => ({
          course_id: id,
          video_url: video.url.trim(),
          title: video.title.trim(),
          order_index: index + 1
        }));

      console.log('Prepared video data:', validVideoData);

      if (validVideoData.length === 0) {
        console.log('No valid videos to insert');
        navigate(`/courses/${id}`);
        return;
      }

      // Insert all videos in a single batch
      const { data: insertedData, error: insertError } = await supabase
        .from('course_videos')
        .insert(validVideoData)
        .select();

      if (insertError) {
        console.error('Error inserting videos:', insertError);
        throw insertError;
      }

      console.log('Videos inserted successfully:', insertedData);
      navigate(`/courses/${id}`);

    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setError('Failed to save changes. Please try again.');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !course) {
    return <div>Error: {error || 'Course not found'}</div>;
  }

  return (
    <div className="edit-course-form">
      <h1>Edit Course</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Title:</label>
          <input
            type="text"
            name="title"
            value={formData?.title || ''}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Description:</label>
          <textarea
            name="description"
            value={formData?.description || ''}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Price:</label>
          <input
            type="number"
            name="price"
            value={formData?.price || ''}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Duration:</label>
          <input
            type="number"
            name="duration"
            value={formData?.duration || ''}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Level:</label>
          <input
            type="text"
            name="level"
            value={formData?.level || ''}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Category:</label>
          <input
            type="text"
            name="category"
            value={formData?.category || ''}
            onChange={handleChange}
            required
          />
        </div>

        <h2>Video URLs</h2>
        {videoData.map((video, index) => (
          <div key={index}>
            <input
              type="text"
              value={video.title}
              onChange={(e) => handleVideoChange(index, 'title', e.target.value)}
              placeholder="Enter video title"
              required
            />
            <input
              type="text"
              value={video.url}
              onChange={(e) => handleVideoChange(index, 'url', e.target.value)}
              placeholder="Enter YouTube video URL"
              required
            />
          </div>
        ))}
        <button type="button" className="add-video-button" onClick={addVideoUrl}>Add Another Video</button>

        <button type="submit" className="edit-course-button">Save Changes</button>
      </form>
    </div>
  );
}