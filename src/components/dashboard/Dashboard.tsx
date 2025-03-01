import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface Course {
  id: string;
  title: string;
  description: string;
  image_url: string;
  level: string;
  category: string;
  created_at: string;
  enrolled_count?: number;
}

interface Enrollment {
  id: string;
  course: Course;
  progress: number;
  created_at: string;
}

export function Dashboard() {
  const { user } = useAuthStore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        if (!user) {
          throw new Error('User not authenticated');
        }

        if (user.role === 'instructor') {
          // Fetch instructor's courses
          const { data, error } = await supabase
            .from('courses')
            .select('*, enrollments:enrollments(count)')
            .eq('instructor_id', user.id);

          if (error) throw error;
          setCourses(data || []);
        } else {
          // Fetch student's enrollments with course data
          const { data, error } = await supabase
            .from('enrollments')
            .select('*, course:courses(*)')
            .eq('user_id', user.id);

          if (error) throw error;
          setEnrollments(data || []);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded-md">
        <p>Error: {error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">
          {user?.role === 'instructor' ? 'Instructor Dashboard' : 'Student Dashboard'}
        </h1>
        
        {user?.role === 'instructor' && (
          <Link 
            to="/courses/create" 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create New Course
          </Link>
        )}
      </div>

      {user?.role === 'instructor' ? (
        <InstructorDashboard courses={courses} />
      ) : (
        <StudentDashboard enrollments={enrollments} />
      )}
    </div>
  );
}

function InstructorDashboard({ courses }: { courses: Course[] }) {
  if (courses.length === 0) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-semibold mb-4">You haven't created any courses yet</h2>
        <p className="mb-6 text-gray-600">Start creating your first course and share your knowledge with students.</p>
        <Link 
          to="/courses/create" 
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Create Your First Course
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Your Courses</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <div key={course.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
            {course.image_url ? (
              <img 
                src={course.image_url} 
                alt={course.title} 
                className="w-full h-48 object-cover"
              />
            ) : (
              <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500">No image</span>
              </div>
            )}
            
            <div className="p-4">
              <h3 className="text-xl font-semibold mb-2">{course.title}</h3>
              <p className="text-gray-600 mb-4 line-clamp-2">{course.description}</p>
              
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm bg-blue-100 text-blue-800 py-1 px-2 rounded">
                  {course.level}
                </span>
                <span className="text-sm bg-green-100 text-green-800 py-1 px-2 rounded">
                  {course.category}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  {course.enrolled_count || 0} students enrolled
                </span>
                
                <div className="flex space-x-2">
                  <Link 
                    to={`/courses/edit/${course.id}`}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Edit
                  </Link>
                  <Link 
                    to={`/courses/${course.id}`}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    View
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StudentDashboard({ enrollments }: { enrollments: Enrollment[] }) {
  if (enrollments.length === 0) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-semibold mb-4">You're not enrolled in any courses yet</h2>
        <p className="mb-6 text-gray-600">Browse our course catalog and find courses that match your interests.</p>
        <Link 
          to="/courses" 
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Browse Courses
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Your Enrolled Courses</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {enrollments.map((enrollment) => (
          <div key={enrollment.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
            {enrollment.course.image_url ? (
              <img 
                src={enrollment.course.image_url} 
                alt={enrollment.course.title} 
                className="w-full h-48 object-cover"
              />
            ) : (
              <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500">No image</span>
              </div>
            )}
            
            <div className="p-4">
              <h3 className="text-xl font-semibold mb-2">{enrollment.course.title}</h3>
              <p className="text-gray-600 mb-4 line-clamp-2">{enrollment.course.description}</p>
              
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-1">Progress: {enrollment.progress}%</p>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${enrollment.progress}%` }}
                  ></div>
                </div>
              </div>
              
              <Link 
                to={`/courses/${enrollment.course.id}`}
                className="block w-full text-center px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Continue Learning
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 