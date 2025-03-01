import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, Calendar, BookOpen } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface Student {
  id: string;
  email: string;
  created_at: string;
  enrollments: {
    course: {
      title: string;
    };
    progress: number;
  }[];
}

export function StudentList() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    const fetchStudents = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        
        // First get all courses by this instructor
        const { data: instructorCourses, error: coursesError } = await supabase
          .from('courses')
          .select('id')
          .eq('instructor_id', user.id);

        if (coursesError) throw coursesError;

        if (!instructorCourses?.length) {
          setStudents([]);
          return;
        }

        // Get all enrollments for these courses
        const { data: enrollments, error: enrollmentsError } = await supabase
          .from('enrollments')
          .select(`
            user_id,
            progress,
            course:courses (
              title
            )
          `)
          .in('course_id', instructorCourses.map(c => c.id));

        if (enrollmentsError) throw enrollmentsError;

        // Get unique student IDs from enrollments
        const studentIds = [...new Set(enrollments.map(e => e.user_id))];

        // Get student profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, created_at')
          .in('id', studentIds);

        if (profilesError) throw profilesError;

        // Combine the data
        const studentsWithEnrollments = profiles.map(profile => ({
          ...profile,
          enrollments: enrollments
            .filter(e => e.user_id === profile.id)
            .map(e => ({
              course: e.course,
              progress: e.progress
            }))
        }));

        setStudents(studentsWithEnrollments);
      } catch (error) {
        console.error('Error fetching students:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch students');
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded relative">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">My Students</h1>

      {students.length === 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 text-center text-gray-500">
          No students are currently enrolled in your courses.
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {students.map((student) => (
              <li key={student.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Mail className="h-5 w-5 text-gray-400 mr-2" />
                      <p className="text-sm font-medium text-indigo-600 truncate">
                        {student.email}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                      <p className="text-sm text-gray-500">
                        Joined {new Date(student.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center">
                      <BookOpen className="h-5 w-5 text-gray-400 mr-2" />
                      <p className="text-sm text-gray-500">
                        Enrolled in {student.enrollments.length} of your courses
                      </p>
                    </div>
                    {student.enrollments.length > 0 && (
                      <div className="mt-2 grid grid-cols-1 gap-2">
                        {student.enrollments.map((enrollment, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{enrollment.course.title}</span>
                            <span className="text-indigo-600">{enrollment.progress}% complete</span>
                          </div>
                        ))}
                      </div>
                    )}
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