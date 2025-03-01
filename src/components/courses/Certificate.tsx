import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Award, Download, Share2 } from 'lucide-react';

interface CertificateData {
  courseTitle: string;
  completionDate: string;
  examScore: number;
  instructorName: string;
}

export const Certificate: React.FC = () => {
  const { courseId } = useParams();
  const { user } = useAuthStore();
  const [certificateData, setCertificateData] = useState<CertificateData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCertificateData = async () => {
      try {
        // Fetch course and exam data
        const { data: examAttempt, error: examError } = await supabase
          .from('exam_attempts')
          .select(`
            score,
            created_at,
            exams (
              course:courses (
                title,
                instructor:profiles (
                  full_name
                )
              )
            )
          `)
          .eq('user_id', user?.id)
          .eq('passed', true)
          .order('created_at', { ascending: false })
          .single();

        if (examError) throw examError;

        setCertificateData({
          courseTitle: examAttempt.exams.course.title,
          completionDate: new Date(examAttempt.created_at).toLocaleDateString(),
          examScore: examAttempt.score,
          instructorName: examAttempt.exams.course.instructor.full_name
        });
      } catch (error) {
        console.error('Error fetching certificate data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCertificateData();
  }, [courseId, user?.id]);

  const handleDownload = () => {
    // Implementation for certificate download (PDF generation)
    window.print();
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: 'My Course Certificate',
        text: `I completed ${certificateData?.courseTitle} on LearnHub!`,
        url: window.location.href
      });
    } catch (error) {
      console.error('Error sharing certificate:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading certificate...</div>;
  }

  if (!certificateData) {
    return <div className="text-center py-8">Certificate not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Certificate Preview */}
      <div className="bg-white rounded-lg shadow-lg p-8 mb-6 print:shadow-none" id="certificate">
        <div className="border-8 border-double border-indigo-200 p-8">
          <div className="text-center">
            <Award className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
            <h1 className="text-4xl font-serif mb-4">Certificate of Completion</h1>
            <p className="text-xl text-gray-600 mb-8">This certifies that</p>
            <p className="text-3xl font-bold text-indigo-600 mb-8">{user?.email}</p>
            <p className="text-xl text-gray-600 mb-4">has successfully completed</p>
            <p className="text-2xl font-bold mb-8">{certificateData.courseTitle}</p>
            <p className="text-lg text-gray-600 mb-8">
              with a score of {certificateData.examScore}%
            </p>
            <div className="flex justify-center items-center space-x-8 mb-8">
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium">{certificateData.completionDate}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Instructor</p>
                <p className="font-medium">{certificateData.instructorName}</p>
              </div>
            </div>
            <div className="w-48 h-1 bg-indigo-600 mx-auto"></div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={handleDownload}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Download className="h-5 w-5 mr-2" />
          Download Certificate
        </button>
        <button
          onClick={handleShare}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <Share2 className="h-5 w-5 mr-2" />
          Share
        </button>
      </div>
    </div>
  );
};