import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2 } from 'lucide-react';

interface Question {
  questionText: string;
  options: string[];
  correctAnswer: string;
  points: number;
}

interface ExamForm {
  title: string;
  description: string;
  duration: number;
  passingScore: number;
  questions: Question[];
}

const initialQuestion: Question = {
  questionText: '',
  options: ['', '', '', ''],
  correctAnswer: '',
  points: 1
};

const initialForm: ExamForm = {
  title: '',
  description: '',
  duration: 60,
  passingScore: 70,
  questions: [{ ...initialQuestion }]
};

export function ExamCreator() {
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ExamForm>(initialForm);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (loading) {
      timeoutId = setTimeout(() => {
        setLoading(false);
        setError('The operation timed out. Please try again.');
      }, 15000); // 15 seconds timeout
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [loading]);

  const handleQuestionChange = (index: number, field: keyof Question, value: any) => {
    const newQuestions = [...formData.questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setFormData({ ...formData, questions: newQuestions });
  };

  const handleOptionChange = (questionIndex: number, optionIndex: number, value: string) => {
    const newQuestions = [...formData.questions];
    newQuestions[questionIndex].options[optionIndex] = value;
    setFormData({ ...formData, questions: newQuestions });
  };

  const addQuestion = () => {
    setFormData({
      ...formData,
      questions: [...formData.questions, { ...initialQuestion }]
    });
  };

  const removeQuestion = (index: number) => {
    const newQuestions = formData.questions.filter((_, i) => i !== index);
    setFormData({ ...formData, questions: newQuestions });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!courseId) {
      setError('Course ID is missing');
      return;
    }

    try {
      setLoading(true);
      console.log('Starting exam creation for course:', courseId);

      // First, create the exam
      const { data: examData, error: examError } = await supabase
        .from('course_exams')
        .insert({
          course_id: courseId,
          title: formData.title,
          description: formData.description || '',
          duration: parseInt(formData.duration.toString()),
          passing_score: parseInt(formData.passingScore.toString())
        })
        .select()
        .single();

      if (examError) {
        console.error('Exam creation error:', examError);
        throw new Error(examError.message);
      }

      if (!examData) {
        throw new Error('Failed to create exam: No data returned');
      }

      console.log('Exam created:', examData);

      // Then create all questions at once
      const questionsToInsert = formData.questions.map((q, index) => ({
        exam_id: examData.id,
        question_text: q.questionText,
        options: q.options,
        correct_answer: q.correctAnswer,
        points: q.points,
        order_index: index + 1
      }));

      const { error: questionsError } = await supabase
        .from('exam_questions')
        .insert(questionsToInsert);

      if (questionsError) {
        // If questions fail, delete the exam
        await supabase
          .from('course_exams')
          .delete()
          .eq('id', examData.id);
        
        console.error('Questions creation error:', questionsError);
        throw new Error(questionsError.message);
      }

      console.log('Exam and questions created successfully');
      setLoading(false);
      navigate(`/courses/${courseId}`);
    } catch (error) {
      console.error('Exam creation failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to create exam');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Create Course Exam</h1>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded relative">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Exam Title</label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
            <input
              type="number"
              required
              min="1"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Passing Score (%)</label>
            <input
              type="number"
              required
              min="0"
              max="100"
              value={formData.passingScore}
              onChange={(e) => setFormData({ ...formData, passingScore: parseInt(e.target.value) })}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Questions</h2>
            <button
              type="button"
              onClick={addQuestion}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </button>
          </div>

          {formData.questions.map((question, qIndex) => (
            <div key={qIndex} className="border rounded-md p-4 space-y-4">
              <div className="flex justify-between items-start">
                <h3 className="text-sm font-medium text-gray-900">Question {qIndex + 1}</h3>
                {formData.questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeQuestion(qIndex)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Question Text</label>
                <textarea
                  required
                  value={question.questionText}
                  onChange={(e) => handleQuestionChange(qIndex, 'questionText', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                {question.options.map((option, oIndex) => (
                  <div key={oIndex} className="mb-2">
                    <input
                      type="text"
                      required
                      value={option}
                      onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder={`Option ${oIndex + 1}`}
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Correct Answer</label>
                <select
                  required
                  value={question.correctAnswer}
                  onChange={(e) => handleQuestionChange(qIndex, 'correctAnswer', e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option value="">Select correct answer</option>
                  {question.options.map((option, index) => (
                    <option key={index} value={option}>
                      {option || `Option ${index + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Points</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={question.points}
                  onChange={(e) => handleQuestionChange(qIndex, 'points', parseInt(e.target.value))}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate(`/courses/${courseId}`)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              'Save Exam'
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 