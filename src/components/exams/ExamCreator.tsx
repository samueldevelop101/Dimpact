import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

interface ExamQuestion {
  question_text: string;
  question_type: 'multiple_choice' | 'true_false';
  correct_answer: string;
  options: string[];
  order_index: number;
  points: number;
}

export function ExamCreator() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  
  const [examData, setExamData] = useState({
    title: '',
    description: '',
    duration: 60,
    passing_score: 70,
    questions: [
      {
        question_text: '',
        question_type: 'multiple_choice' as const,
        correct_answer: '',
        options: ['', '', '', ''],
        order_index: 0,
        points: 1
      }
    ]
  });

  const [selectedQuestionType, setSelectedQuestionType] = useState<'multiple_choice' | 'true_false'>('multiple_choice');

  const handleAddQuestion = (type: 'multiple_choice' | 'true_false') => {
    setExamData(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          question_text: '',
          question_type: type,
          correct_answer: '',
          options: type === 'multiple_choice' ? ['', '', '', ''] : ['True', 'False'],
          order_index: prev.questions.length,
          points: 1
        }
      ]
    }));
  };

  const handleQuestionChange = (index: number, field: keyof ExamQuestion, value: any) => {
    const newQuestions = [...examData.questions];
    newQuestions[index] = {
      ...newQuestions[index],
      [field]: value,
      ...(field === 'question_type' && {
        options: value === 'multiple_choice' ? ['', '', '', ''] : ['True', 'False'],
        correct_answer: ''
      })
    };
    setExamData(prev => ({ ...prev, questions: newQuestions }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !courseId) return;

    try {
      setLoading(true);
      setError(null);

      // Validate questions
      const validQuestions = examData.questions.every(q => 
        q.question_text && 
        q.correct_answer && 
        q.options.length > 0
      );

      if (!validQuestions) {
        throw new Error('Please complete all questions and answers');
      }

      // Format questions for storage
      const formattedQuestions = examData.questions.map((q, index) => ({
        id: crypto.randomUUID(),
        question_text: q.question_text,
        type: q.question_type,
        correct_answer: q.correct_answer,
        options: q.options,
        order_index: index,
        points: q.points
      }));

      // First create the exam in course_exams
      const { data: courseExam, error: examError } = await supabase
        .from('course_exams')
        .insert({
          course_id: courseId,
          title: examData.title,
          description: examData.description,
          duration: examData.duration,
          passing_score: examData.passing_score,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (examError) {
        console.error('Exam creation error:', examError);
        throw examError;
      }

      // Then create the questions in exam_questions
      const { error: questionsError } = await supabase
        .from('exam_questions')
        .insert(
          formattedQuestions.map(q => ({
            exam_id: courseExam.id,
            question_text: q.question_text,
            question_type: q.type,
            correct_answer: q.correct_answer,
            options: q.options,
            order_index: q.order_index,
            points: q.points
          }))
        );

      if (questionsError) {
        // Clean up if questions insertion fails
        await supabase
          .from('course_exams')
          .delete()
          .eq('id', courseExam.id);
        throw questionsError;
      }

      navigate(`/courses/${courseId}`);
    } catch (error) {
      console.error('Error creating exam:', error);
      setError(
        error instanceof Error 
          ? error.message 
          : 'Failed to create exam. Please ensure all questions are complete.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Create Course Exam</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-md">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Exam Title
          </label>
          <input
            type="text"
            value={examData.title}
            onChange={(e) => setExamData(prev => ({ ...prev, title: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            value={examData.description}
            onChange={(e) => setExamData(prev => ({ ...prev, description: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Duration (minutes)
            </label>
            <input
              type="number"
              value={examData.duration}
              onChange={(e) => setExamData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              min="1"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Passing Score (%)
            </label>
            <input
              type="number"
              value={examData.passing_score}
              onChange={(e) => setExamData(prev => ({ ...prev, passing_score: parseInt(e.target.value) }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              min="0"
              max="100"
              required
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium">Questions</h2>
            <div className="space-x-2">
              <button
                type="button"
                onClick={() => handleAddQuestion('multiple_choice')}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Add Multiple Choice
              </button>
              <button
                type="button"
                onClick={() => handleAddQuestion('true_false')}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Add True/False
              </button>
            </div>
          </div>

          {examData.questions.map((question, qIndex) => (
            <div key={qIndex} className="border rounded-md p-4">
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Question {qIndex + 1} ({question.question_type === 'multiple_choice' ? 'Multiple Choice' : 'True/False'})
                  </label>
                </div>
                <input
                  type="text"
                  value={question.question_text}
                  onChange={(e) => handleQuestionChange(qIndex, 'question_text', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                  placeholder="Enter your question"
                />
              </div>

              <div className="space-y-2">
                {question.question_type === 'multiple_choice' ? (
                  question.options.map((option, oIndex) => (
                    <div key={oIndex} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name={`correct_${qIndex}`}
                        checked={question.correct_answer === option}
                        onChange={() => handleQuestionChange(qIndex, 'correct_answer', option)}
                        className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                        required
                      />
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...question.options];
                          newOptions[oIndex] = e.target.value;
                          handleQuestionChange(qIndex, 'options', newOptions);
                        }}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder={`Option ${oIndex + 1}`}
                        required
                      />
                    </div>
                  ))
                ) : (
                  <div className="space-x-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name={`correct_${qIndex}`}
                        value="True"
                        checked={question.correct_answer === 'True'}
                        onChange={() => handleQuestionChange(qIndex, 'correct_answer', 'True')}
                        className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                        required
                      />
                      <span className="ml-2">True</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name={`correct_${qIndex}`}
                        value="False"
                        checked={question.correct_answer === 'False'}
                        onChange={() => handleQuestionChange(qIndex, 'correct_answer', 'False')}
                        className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                        required
                      />
                      <span className="ml-2">False</span>
                    </label>
                  </div>
                )}
              </div>

              {examData.questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setExamData(prev => ({
                      ...prev,
                      questions: prev.questions.filter((_, index) => index !== qIndex)
                    }));
                  }}
                  className="mt-2 text-sm text-red-600 hover:text-red-800"
                >
                  Remove Question
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate(`/courses/${courseId}`)}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Exam...
              </div>
            ) : (
              'Create Exam'
            )}
          </button>
        </div>

        {examData.questions.length > 10 && (
          <p className="text-sm text-amber-600 mt-2">
            Creating an exam with many questions might take a moment. Please don't close the page.
          </p>
        )}
      </form>
    </div>
  );
} 