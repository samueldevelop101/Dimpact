import React from 'react';
import { Link } from 'react-router-dom';

export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-800 text-white py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <h3 className="text-xl font-bold">Dimpact</h3>
            <p className="text-gray-400 mt-1">Learn at your own pace</p>
          </div>
          
          <div className="flex flex-wrap justify-center mb-4 md:mb-0">
            <Link to="/" className="mx-2 hover:text-blue-400">Home</Link>
            <Link to="/courses" className="mx-2 hover:text-blue-400">Courses</Link>
            <Link to="/about" className="mx-2 hover:text-blue-400">About</Link>
            <Link to="/contactus" className="mx-2 hover:text-blue-400">Contact</Link>
          </div>
          
          <div className="text-sm text-gray-400">
            &copy; {currentYear} Dimpact. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
} 