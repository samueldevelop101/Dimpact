import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: number;
  points: number;
}

interface Exam {
  id: string;
  title: string;
  description: string;
  duration: number;
  passing_score: number;
  questions: Question[];
}

export const CourseExam: React.FC = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [exam, setExam] = useState<Exam | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExam = async () => {
      try {
        setLoading(true);
        const { data: examData, error: examError } = await supabase
          .from('course_exams')
          .select(`
            id,
            title,
            description,
            duration,
            passing_score,
            questions:exam_questions (
              id,
              question_text,
              options,
              correct_answer,
              points
            )
          `)
          .eq('course_id', courseId)
          .single();

        if (examError) throw examError;
        if (!examData) throw new Error('No exam found');

        // Initialize selected answers array with -1 (no selection)
        setSelectedAnswers(new Array(examData.questions.length).fill(-1));
        setTimeLeft(examData.duration * 60); // Convert minutes to seconds
        setExam(examData);
      } catch (error) {
        console.error('Error fetching exam:', error);
        setError(error instanceof Error ? error.message : 'Failed to load exam');
      } finally {
        setLoading(false);
      }
    };

    fetchExam();
  }, [courseId]);

  useEffect(() => {
    if (!timeLeft || examSubmitted) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev && prev > 0) {
          return prev - 1;
        } else {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, examSubmitted]);

  const handleAnswerSelect = (questionIndex: number, answerIndex: number) => {
    if (examSubmitted) return;
    
    setSelectedAnswers((prev) => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
  };

  const handleSubmit = async () => {
    if (!exam || !user || !courseId) return;

    try {
      let totalScore = 0;
      let totalPoints = 0;

      exam.questions.forEach((question, index) => {
        totalPoints += question.points;
        if (selectedAnswers[index] === question.correct_answer) {
          totalScore += question.points;
        }
      });

      const finalScore = Math.round((totalScore / totalPoints) * 100);
      const passed = finalScore >= exam.passing_score;

      // Save exam attempt with course_id
      const { error: attemptError } = await supabase
        .from('exam_attempts')
        .insert({
          user_id: user.id,
          exam_id: exam.id,
          course_id: courseId,
          score: finalScore,
          passed,
          answers: selectedAnswers,
          completed: true,
          completed_at: new Date().toISOString()
        });

      if (attemptError) {
        console.error('Attempt error:', attemptError);
        throw attemptError;
      }

      setScore(finalScore);
      setExamSubmitted(true);

      if (passed) {
        // Update enrollment status
        const { error: enrollmentError } = await supabase
          .from('enrollments')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString(),
            progress: 100
          })
          .match({ 
            user_id: user.id, 
            course_id: courseId 
          });

        if (enrollmentError) {
          console.error('Enrollment error:', enrollmentError);
          throw enrollmentError;
        }

        // If passed, create a certificate
        const { error: certificateError } = await supabase
          .from('certificates')
          .insert({
            user_id: user.id,
            course_id: courseId,
            exam_id: exam.id,
            issued_at: new Date().toISOString(),
            score: finalScore
          });

        if (certificateError) {
          console.error('Certificate error:', certificateError);
          throw certificateError;
        }
      }
    } catch (error) {
      console.error('Error submitting exam:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit exam');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded relative">
          {error || 'Exam not found'}
        </div>
      </div>
    );
  }

  if (examSubmitted) {
    return (
      <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center">
            {score >= exam.passing_score ? (
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            ) : (
              <XCircle className="mx-auto h-12 w-12 text-red-500" />
            )}
            <h2 className="mt-4 text-2xl font-bold text-gray-900">
              {score >= exam.passing_score ? 'Congratulations!' : 'Keep Learning!'}
            </h2>
            <p className="mt-2 text-lg text-gray-600">
              Your score: {score}%
            </p>
            <div className="mt-6">
              <button
                onClick={() => navigate(`/courses/${courseId}`)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Return to Course
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{exam.title}</h1>
          <div className="flex items-center text-gray-500">
            <Clock className="h-5 w-5 mr-2" />
            <span>
              {Math.floor(timeLeft! / 60)}:{(timeLeft! % 60).toString().padStart(2, '0')}
            </span>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Question {currentQuestion + 1} of {exam.questions.length}
            </h3>
            <p className="text-gray-700 mb-4">
              {exam.questions[currentQuestion].question_text}
            </p>
            <div className="space-y-3">
              {exam.questions[currentQuestion].options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(currentQuestion, index)}
                  className={`w-full text-left p-3 rounded-md border ${
                    selectedAnswers[currentQuestion] === index
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setCurrentQuestion(prev => prev - 1)}
              disabled={currentQuestion === 0}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md disabled:opacity-50"
            >
              Previous
            </button>
            {currentQuestion === exam.questions.length - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={selectedAnswers.includes(-1)}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                Submit Exam
              </button>
            ) : (
              <button
                onClick={() => setCurrentQuestion(prev => prev + 1)}
                disabled={selectedAnswers[currentQuestion] === -1}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                Next Question
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};