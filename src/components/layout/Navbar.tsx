import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { LoadingSpinner } from '../common/LoadingSpinner';

export function Navbar() {
  const { user, signOut, loading } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      setIsMenuOpen(false);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="bg-blue-700 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold">Dimpact</span>
            </Link>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            <Link to="/" className="px-3 py-2 rounded-md hover:bg-blue-600">
              Home
            </Link>
            
            {user ? (
              <>
                <Link to="/dashboard" className="px-3 py-2 rounded-md hover:bg-blue-600">
                  Dashboard
                </Link>
                <Link to="/courses" className="px-3 py-2 rounded-md hover:bg-blue-600">
                  Courses
                </Link>
                
                {user.role === 'instructor' && (
                  <Link to="/courses/create" className="px-3 py-2 rounded-md hover:bg-blue-600">
                    Create Course
                  </Link>
                )}
                
                <Link to="/profile" className="px-3 py-2 rounded-md hover:bg-blue-600">
                  Profile
                </Link>
                
                <button
                  onClick={handleSignOut}
                  disabled={isLoggingOut}
                  className="px-3 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 flex items-center"
                >
                  {isLoggingOut ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">Signing out...</span>
                    </>
                  ) : (
                    'Sign Out'
                  )}
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="px-3 py-2 rounded-md hover:bg-blue-600">
                  Log In
                </Link>
                <Link to="/signup" className="px-3 py-2 bg-white text-blue-700 rounded-md hover:bg-gray-100">
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md hover:bg-blue-600 focus:outline-none"
            >
              <span className="sr-only">Open main menu</span>
              <svg
                className={`${isMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg
                className={`${isMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`${isMenuOpen ? 'block' : 'hidden'} md:hidden`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <Link
            to="/"
            className="block px-3 py-2 rounded-md hover:bg-blue-600"
            onClick={() => setIsMenuOpen(false)}
          >
            Home
          </Link>
          
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="block px-3 py-2 rounded-md hover:bg-blue-600"
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                to="/courses"
                className="block px-3 py-2 rounded-md hover:bg-blue-600"
                onClick={() => setIsMenuOpen(false)}
              >
                Courses
              </Link>
              
              {user.role === 'instructor' && (
                <Link
                  to="/courses/create"
                  className="block px-3 py-2 rounded-md hover:bg-blue-600"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Create Course
                </Link>
              )}
              
              <Link
                to="/profile"
                className="block px-3 py-2 rounded-md hover:bg-blue-600"
                onClick={() => setIsMenuOpen(false)}
              >
                Profile
              </Link>
              
              <button
                onClick={handleSignOut}
                disabled={isLoggingOut}
                className="block w-full text-left px-3 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
              >
                {isLoggingOut ? (
                  <div className="flex items-center">
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Signing out...</span>
                  </div>
                ) : (
                  'Sign Out'
                )}
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="block px-3 py-2 rounded-md hover:bg-blue-600"
                onClick={() => setIsMenuOpen(false)}
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="block px-3 py-2 bg-white text-blue-700 rounded-md hover:bg-gray-100"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
} 