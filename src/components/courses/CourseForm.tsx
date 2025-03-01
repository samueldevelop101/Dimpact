import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BookOpen, FileText, Clock, Video, Plus, Trash2, FileImage, Upload, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { toast } from 'react-toastify';

interface Video {
  title: string;
  description: string;
  youtube_url: string;
  order_index: number;
}

interface CourseFormData {
  title: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  image_url: string;
  price: number;
  duration: number;
  videos: Video[];
}

interface Props {
  mode: 'create' | 'edit';
  courseId?: string;
}

interface CourseData {
  title: string;
  description: string;
  image_url: string;
  price: number;
  duration: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  videos: Video[];
}

export function CourseForm({ mode = 'create' }: Props) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [formData, setFormData] = useState<CourseData>({
    title: '',
    description: '',
    image_url: '',
    price: 0,
    duration: 1,
    level: 'beginner',
    category: '',
    videos: [],
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loadingCourse, setLoadingCourse] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [exams, setExams] = useState<{ title: string; description: string; questions: { question: string; options: string[]; correctAnswer: string }[] }[]>([]);
  const [isPublished, setIsPublished] = useState(false);
  
  // Check if user is instructor
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'instructor') {
      navigate('/dashboard');
    }
  }, [user, navigate]);
  
  // Fetch course data if in edit mode
  useEffect(() => {
    const fetchCourse = async () => {
      if (mode === 'edit' && id) {
        try {
          setLoadingCourse(true);
          setError(null);
          
          const { data: courseData, error: courseError } = await supabase
            .from('courses')
            .select('*, videos:course_videos(*), exams:course_exams(*)')
            .eq('id', id)
            .single();
            
          if (courseError) throw courseError;
          
          if (courseData) {
            setFormData({
              title: courseData.title || '',
              description: courseData.description || '',
              image_url: courseData.image_url || '',
              price: courseData.price || 0,
              duration: courseData.duration || 1,
              level: courseData.level || 'beginner',
              category: courseData.category || '',
              videos: courseData.videos || [],
            });
            setIsPublished(courseData.published || false);
          }
        } catch (error) {
          console.error('Error fetching course:', error);
          setError('Failed to load course data');
        } finally {
          setLoadingCourse(false);
        }
      } else {
        setLoadingCourse(false);
      }
    };
    
    fetchCourse();
  }, [id, mode]);
  
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value,
    }));
  };
  
  const handleAddExam = () => {
    setExams([...exams, { title: '', description: '', questions: [{ question: '', options: ['', ''], correctAnswer: '' }] }]);
  };

  const handleExamChange = (examIndex: number, field: string, value: string) => {
    const updatedExams = exams.map((exam, i) => {
      if (i === examIndex) {
        const updatedQuestions = exam.questions.map((q, j) => 
          j === 0 ? { ...q, [field]: value } : q
        );
        return { ...exam, questions: updatedQuestions };
      }
      return exam;
    });
    setExams(updatedExams);
  };

  const handleQuestionChange = (examIndex: number, questionIndex: number, field: string, value: string) => {
    const updatedExams = exams.map((exam, i) => {
      if (i === examIndex) {
        const updatedQuestions = exam.questions.map((q, j) => 
          j === questionIndex ? { ...q, [field]: value } : q
        );
        return { ...exam, questions: updatedQuestions };
      }
      return exam;
    });
    setExams(updatedExams);
  };

  const handleAddQuestion = (examIndex: number) => {
    const updatedExams = exams.map((exam, i) => {
      if (i === examIndex) {
        return {
          ...exam,
          questions: [...exam.questions, { question: '', options: ['', ''], correctAnswer: '' }]
        };
      }
      return exam;
    });
    setExams(updatedExams);
  };

  const handleOptionChange = (examIndex: number, questionIndex: number, optionIndex: number, value: string) => {
    const updatedExams = exams.map((exam, i) => {
      if (i === examIndex) {
        const updatedQuestions = exam.questions.map((q, j) => {
          if (j === questionIndex) {
            const updatedOptions = q.options.map((opt, k) => (k === optionIndex ? value : opt));
            return { ...q, options: updatedOptions };
          }
          return q;
        });
        return { ...exam, questions: updatedQuestions };
      }
      return exam;
    });
    setExams(updatedExams);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Basic validation
      if (!formData.title || !formData.description || !formData.image_url || !formData.category) {
        throw new Error('Please fill in all required fields');
      }

      // Validate that at least one video is provided
      if (formData.videos.length === 0) {
        throw new Error('At least one video must be added');
      }

      // Prepare course data
      const courseData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        image_url: formData.image_url,
        price: formData.price,
        duration: formData.duration,
        level: formData.level,
        instructor_id: user?.id,
        category: formData.category,
        published: isPublished,
        created_at: new Date().toISOString()
      };

      let courseId;

      if (mode === 'edit' && id) {
        // Update course
        const { error: updateError } = await supabase
          .from('courses')
          .update(courseData)
          .eq('id', id);

        if (updateError) {
          throw updateError;
        }
        courseId = id;
      } else {
        // Create course
        const { data: newCourse, error: courseError } = await supabase
          .from('courses')
          .insert([courseData])
          .select()
          .single();

        if (courseError) {
          throw courseError;
        }
        courseId = newCourse.id;
      }

      // Prepare video data
      const videoData = formData.videos.map((video, index) => ({
        course_id: courseId,
        title: video.title.trim(),
        youtube_url: video.youtube_url.trim(),
        description: video.description.trim(),
        order_index: index + 1
      }));

      // Delete existing videos if in edit mode
      if (mode === 'edit') {
        const { error: deleteError } = await supabase
          .from('course_videos')
          .delete()
          .eq('course_id', courseId);

        if (deleteError) {
          throw deleteError;
        }
      }

      // Insert videos
      if (videoData.length > 0) {
        const { error: videoError } = await supabase
          .from('course_videos')
          .insert(videoData);

        if (videoError) {
          throw videoError;
        }
      }

      setSuccess(mode === 'edit' ? 'Course updated successfully!' : 'Course created successfully!');
      toast.success(mode === 'edit' ? 'Course updated successfully!' : 'Course created successfully!');
      navigate(`/courses/${courseId}`);

    } catch (error) {
      console.error('Error saving course:', error);
      setError(error instanceof Error ? error.message : 'Failed to save course');
      toast.error(error instanceof Error ? error.message : 'Failed to save course');
    } finally {
      setLoading(false);
    }
  };
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImageUploading(false);
      return;
    }

    try {
      setUploadError(null);
      setImageUploading(true);
      setImagePreview(null); // Reset preview before upload

      // Check file size (1MB = 1024 * 1024 bytes)
      if (file.size > 1024 * 1024) {
        throw new Error('Image size must be less than 1MB');
      }

      // Check file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('File must be a JPG, JPEG or PNG image');
      }

      // Create a preview immediately after validation
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);

      // Generate a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `course-images/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('course-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('course-images')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get image URL');
      }

      // Update form data with the new image URL
      setFormData(prev => ({
        ...prev,
        image_url: urlData.publicUrl
      }));

      toast.success('Image uploaded successfully!');
    } catch (error) {
      console.error('Image upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
      setUploadError(errorMessage);
      setImagePreview(null);
      setFormData(prev => ({
        ...prev,
        image_url: ''
      }));
      toast.error(errorMessage);
    } finally {
      setImageUploading(false);
      // Reset the file input
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const removeImage = () => {
    setFormData(prev => ({
      ...prev,
      image_url: ''
    }));
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setUploadError(null);
    setImageUploading(false);
  };
  
  if (loadingCourse) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        {mode === 'create' ? 'Create New Course' : 'Edit Course'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Course Information */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Course Details</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Course Title
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                required
                rows={4}
                value={formData.description}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="level" className="block text-sm font-medium text-gray-700">
                  Level
                </label>
                <select
                  id="level"
                  name="level"
                  required
                  value={formData.level}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                  Price ($)
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  min="0"
                  step="0.01"
                  required
                  value={formData.price}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course Image {!formData.image_url && <span className="text-red-500">*</span>}
              </label>
              <div className="space-y-4">
                {(imagePreview || formData.image_url) && (
                  <div className="relative w-full max-w-[300px]">
                    <img
                      src={imagePreview || formData.image_url}
                      alt="Course preview"
                      className="w-full h-[200px] object-cover rounded-lg"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        img.src = 'https://via.placeholder.com/300x200?text=Image+Load+Error';
                      }}
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                
                <div className="flex items-center space-x-4">
                  <label className={`flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium ${
                    imageUploading 
                      ? 'bg-gray-100 cursor-not-allowed' 
                      : 'bg-white hover:bg-gray-50 cursor-pointer'
                  }`}>
                    {imageUploading ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5 mr-2" />
                        <span>Upload Image</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/jpg"
                      onChange={handleImageUpload}
                      disabled={imageUploading}
                      className="hidden"
                    />
                  </label>
                </div>
                
                {uploadError && (
                  <p className="text-sm text-red-600">{uploadError}</p>
                )}
                
                <div className="text-sm text-gray-500 space-y-1">
                  <p>Maximum file size: 1MB</p>
                  <p>Supported formats: PNG, JPEG, JPG</p>
                  {!formData.image_url && !imageUploading && (
                    <p className="text-red-500">* Course image is required</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                Duration (hours)
              </label>
              <input
                type="number"
                id="duration"
                name="duration"
                min="0"
                step="0.5"
                required
                value={formData.duration}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                id="category"
                name="category"
                required
                value={formData.category}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Select a category</option>
                <option value="web-development">Web Development</option>
                <option value="data-science">Data Science</option>
                <option value="design">Design</option>
                <option value="marketing">Marketing</option>
                <option value="business">Business</option>
                {/* Add more categories as needed */}
              </select>
            </div>

            <div>
              <label>
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                />
                Publish Course
              </label>
            </div>
          </div>
        </div>

        {/* Video Section */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Course Videos</h2>
            <button
              type="button"
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  videos: [
                    ...prev.videos,
                    {
                      title: '',
                      description: '',
                      youtube_url: '',
                      order_index: prev.videos.length
                    }
                  ]
                }));
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Add Video
            </button>
          </div>

          <div className="space-y-6">
            {formData.videos.map((video, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-medium">Video {index + 1}</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        videos: prev.videos.filter((_, i) => i !== index)
                      }));
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Title
                    </label>
                    <input
                      type="text"
                      required
                      value={video.title}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev,
                          videos: prev.videos.map((v, i) =>
                            i === index ? { ...v, title: e.target.value } : v
                          )
                        }));
                      }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      required
                      value={video.description}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev,
                          videos: prev.videos.map((v, i) =>
                            i === index ? { ...v, description: e.target.value } : v
                          )
                        }));
                      }}
                      rows={2}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      YouTube URL
                    </label>
                    <input
                      type="url"
                      required
                      value={video.youtube_url}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev,
                          videos: prev.videos.map((v, i) =>
                            i === index ? { ...v, youtube_url: e.target.value } : v
                          )
                        }));
                      }}
                      placeholder="https://youtube.com/watch?v=..."
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Enter the full YouTube video URL
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Exam Section */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Exams</h2>
          <button
            type="button"
            onClick={handleAddExam}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Add Exam
          </button>
          <div className="space-y-4 mt-4">
            {exams.map((exam, examIndex) => (
              <div key={examIndex} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-medium">Exam {examIndex + 1}</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setExams(exams.filter((_, i) => i !== examIndex));
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <input
                    type="text"
                    value={exam.title}
                    onChange={(e) => handleExamChange(examIndex, 'title', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={exam.description}
                    onChange={(e) => handleExamChange(examIndex, 'description', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <h4 className="text-lg font-medium mt-4">Questions</h4>
                {exam.questions.map((question, questionIndex) => (
                  <div key={questionIndex} className="border rounded-lg p-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Question</label>
                      <input
                        type="text"
                        value={question.question}
                        onChange={(e) => handleQuestionChange(examIndex, questionIndex, 'question', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <h5 className="text-md font-medium mt-2">Options</h5>
                    {question.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center mb-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => handleOptionChange(examIndex, questionIndex, optionIndex, e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleAddQuestion(examIndex)}
                      className="inline-flex items-center px-2 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Add Option
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Saving...
              </>
            ) : (
              'Save Course'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}