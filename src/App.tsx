import React, { useEffect, useState, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LoginForm } from './components/auth/LoginForm';
import { SignupForm } from './components/auth/SignupForm';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { StudentDashboard } from './components/dashboard/StudentDashboard';
import { InstructorDashboard } from './components/dashboard/InstructorDashboard';
import { CourseForm } from './components/courses/CourseForm';
import { CourseList } from './components/courses/CourseList';
import { CourseViewer } from './components/courses/CourseViewer';
import { CourseExam } from './components/courses/CourseExam';
import { Certificate } from './components/courses/Certificate';
import { useAuthStore, initializeAuth } from './store/authStore';
import { HomePage } from './components/pages/HomePage';
import { ExamCreator } from './components/courses/ExamCreator';
import { ExamAnalytics } from './components/courses/ExamAnalytics';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { StudentList } from './components/dashboard/StudentList';
import { MyLearning } from './components/dashboard/MyLearning';
import { CourseView } from './components/courses/CourseView';
import { AllCourses } from './components/courses/AllCourses';
import { RoleCheck } from './components/debug/RoleCheck';
import { UserProfile } from './components/profile/UserProfile';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import { AuthCallback } from './components/auth/AuthCallback';
import ContactUs from './components/pages/ContactUs';
import About from './components/pages/About';
import { CourseDetailsStudent } from './components/courses/CourseDetailsStudent';
// import { CourseDetailsInstructor } from './components/courses/CourseDetailsInstructor';
import { CourseDetailsInstructor } from './components/courses/CourseDetailsInstructor';
import { EditCourse } from './components/courses/EditCourse';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, error, initialized } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (!initialized) {
      initializeAuth();
    }
  }, [initialized]);

  if (!initialized || loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        Error: {error}
        <button 
          onClick={() => window.location.reload()} 
          className="ml-4 text-indigo-600 hover:text-indigo-800"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  console.log('User:', user);

  return <>{children}</>;
}

function InstructorRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user || user.role !== 'instructor') {
    return <Navigate to="/dashboard" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function Dashboard() {
  const { user } = useAuthStore();
  console.log('Dashboard - Current user:', user); // Debug log
  
  if (!user) {
    console.log('Dashboard - No user found'); // Debug log
    return null;
  }

  console.log('Dashboard - Rendering for role:', user.role); // Debug log
  return user.role === 'instructor' ? <InstructorDashboard /> : <StudentDashboard />;
}

function App() {
  const { loading, initialized } = useAuthStore();

  useEffect(() => {
    if (!initialized) {
      console.log('Initializing auth from App component');
      initializeAuth();
    }
  }, [initialized]);

  if (loading && !initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <Router>
      <RoleCheck />
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginForm />} />
            <Route path="/signup" element={<SignupForm />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            } />
            <Route path="/courses" element={
              <ProtectedRoute>
                <CourseList />
              </ProtectedRoute>
            } />
            <Route path="/courses/student/:id" element={<CourseDetailsStudent />} />
            <Route path="/courses/instructor/:id" element={<CourseDetailsInstructor />} />
            <Route path="/courses/create" element={
              <InstructorRoute>
                <CourseForm mode="create" />
              </InstructorRoute>
            } />
            <Route path="/courses/edit/:id" element={
              <InstructorRoute>
                <CourseForm mode="edit" />
              </InstructorRoute>
            } />
            <Route path="/edit-course/:id" element={<EditCourse />} />
            <Route path="/contactus" element={<ContactUs />} />
            <Route path="/about" element={<About />} />
            
            {/* 404 Not Found */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
        <ToastContainer position="bottom-right" />
      </div>
    </Router>
  );
}

// Route guards
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  console.log('User:', user);

  return <>{children}</>;
}

function NotFound() {
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold mb-6">404 - Page Not Found</h1>
      <p className="text-xl mb-8">The page you are looking for does not exist.</p>
    </div>
  );
}

export default App