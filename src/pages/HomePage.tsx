import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../supabaseClient'; // Ensure this path is correct

export function HomePage() {
  const { user } = useAuthStore();
  const [courses, setCourses] = useState<CourseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({});
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [questions, setQuestions] = useState([{ question: '', options: ['', ''], correctAnswer: '' }]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .eq('published', true) // Assuming you have a published field to filter courses
          .order('created_at', { ascending: false }); // Order by creation date

        if (error) throw error;

        setCourses(data);
      } catch (error) {
        console.error('Error fetching courses:', error);
        setError('Failed to load courses. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const handleImageUpload = async (file: File) => {
    const { data, error } = await supabase.storage
      .from('course-images')
      .upload(`public/${file.name}`, file);

    if (error) {
      console.error('Error uploading image:', error);
      return null;
    }

    const { publicURL } = supabase.storage
      .from('course-images')
      .getPublicUrl(data.path);

    return publicURL; // Return the public URL of the uploaded image
  };

  const handleVideoUpload = (video: VideoType) => {
    setVideos((prevVideos) => [...prevVideos, video]);
  };

  const addQuestion = () => {
    setQuestions((prevQuestions) => [
      ...prevQuestions,
      { question: '', options: ['', ''], correctAnswer: '' },
    ]);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-6">Welcome to Dimpact</h1>
        <p className="text-xl mb-8">Learn at your own pace with our extensive course library.</p>
        
        {user ? (
          <div className="mt-8 flex justify-center gap-4">
            <Link 
              to="/dashboard" 
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Go to Dashboard
            </Link>
            <Link 
              to="/courses" 
              className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Browse Courses
            </Link>
          </div>
        ) : (
          <div className="mt-8 flex justify-center gap-4">
            <Link 
              to="/login" 
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Log In
            </Link>
            <Link 
              to="/signup" 
              className="px-6 py-3 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
      
      {/* Courses Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 my-12">
        {courses.length > 0 ? (
          courses.map(course => (
            <div key={course.id} className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">{course.title}</h2>
              <p className="text-gray-600 mb-4">{course.description}</p>
              <img src={course.image_url} alt={course.title} />
              <Link to={`/courses/${course.id}`} className="text-blue-500">View Course</Link>
            </div>
          ))
        ) : (
          <div className="col-span-1 md:col-span-3 text-center">
            <h2 className="text-xl font-semibold">No courses available yet.</h2>
            <p className="text-gray-600">Check back later or create a course!</p>
          </div>
        )}
      </div>
      
      {/* Featured Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 my-12">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Learn Anywhere</h2>
          <p className="text-gray-600 mb-4">
            Access courses on any device, anytime. Learn at your own pace and on your own schedule.
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Expert Instructors</h2>
          <p className="text-gray-600 mb-4">
            Learn from industry experts who share their knowledge and real-world experience.
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Diverse Courses</h2>
          <p className="text-gray-600 mb-4">
            Explore a wide range of courses across various disciplines and skill levels.
          </p>
        </div>
      </div>
      
      {/* Call to Action */}
      <div className="bg-blue-50 p-8 rounded-lg shadow-md text-center my-12">
        <h2 className="text-2xl font-semibold mb-4">Start Your Learning Journey Today</h2>
        <p className="text-gray-600 mb-6">
          Join thousands of students already learning on our platform.
        </p>
        {!user && (
          <Link 
            to="/signup" 
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create Free Account
          </Link>
        )}
      </div>

      {/* Display the count */}
      <p>{videos.length} video(s) uploaded</p>

      {questions.map((q, index) => (
        <div key={index}>
          <input
            type="text"
            value={q.question}
            onChange={(e) => {
              const newQuestions = [...questions];
              newQuestions[index].question = e.target.value;
              setQuestions(newQuestions);
            }}
            placeholder="Question"
          />
          {q.options.map((option, optIndex) => (
            <input
              key={optIndex}
              type="text"
              value={option}
              onChange={(e) => {
                const newQuestions = [...questions];
                newQuestions[index].options[optIndex] = e.target.value;
                setQuestions(newQuestions);
              }}
              placeholder={`Option ${optIndex + 1}`}
            />
          ))}
          <button onClick={() => addOption(index)}>Add Option</button>
        </div>
      ))}
    </div>
  );
} 