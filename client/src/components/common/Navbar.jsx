import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; // Import Auth Context
import Button from './Button.jsx';
import { Sun, Moon, LayoutDashboard, Brain, Archive, Calendar, LogOut, User } from 'lucide-react';

const Navbar = () => {
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const { isAuthenticated, logout, user } = useAuth(); // Access auth state
  const navigate = useNavigate();

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleLogout = () => {
    logout();
    navigate('/login'); // Redirect to login page after logging out
  };

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo / Brand Name */}
          <div className="shrink-0 flex items-center">
            <Link
              to="/"
              className="text-2xl font-bold text-blue-600 dark:text-blue-500"
            >
              Habitify
            </Link>
          </div>

          {/* Nav Links - Only visible when logged in */}
          {isAuthenticated && (
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                to="/"
                className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <LayoutDashboard size={18} className="mr-2" />
                Dashboard
              </Link>
              <Link
                to="/progress-tracker"
                className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <Calendar size={18} className="mr-2" />
                Progress Tracker
              </Link>
              <Link
                to="/archived"
                className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <Archive size={18} className="mr-2" />
                Archived
              </Link>
              <Link
                to="/diet-planner"
                className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <Brain size={18} className="mr-2" />
                AI Diet Planner
              </Link>
            </div>
          )}

          {/* Right Side */}
          <div className="flex items-center">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 mr-2"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className="ml-2 flex items-center space-x-3">
              {!isAuthenticated ? (
                // Guest View: Show Login/Signup
                <>
                  <Button as={Link} to="/login" variant="secondary" size="sm">
                    Login
                  </Button>
                  <Button as={Link} to="/signup" size="sm">
                    Sign Up
                  </Button>
                </>
              ) : (
                // Logged In View: Show User Name and Logout
                <>
                  <div className="hidden md:flex items-center text-sm font-medium text-gray-700 dark:text-gray-200 mr-2">
                    <User size={18} className="mr-1" />
                    {user?.name || 'User'}
                  </div>
                  <Button 
                    onClick={handleLogout} 
                    variant="secondary" 
                    size="sm"
                    className="flex items-center text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/20"
                  >
                    <LogOut size={16} className="mr-1" />
                    Logout
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;