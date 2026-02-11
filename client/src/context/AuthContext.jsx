import React, { createContext, useState, useContext, useEffect } from 'react';
import * as authService from '../services/authService.js';
import {
  setAuthToken,
  getAuthToken,
  removeAuthToken,
} from '../services/tokenService';
import Loader from '../components/common/Loader.jsx';

// 1. Create the context
const AuthContext = createContext();

// 2. Create a custom hook to use the context
export const useAuth = () => {
  return useContext(AuthContext);
};

// 3. Create the Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // On initial app load, check for an existing token and validate it
  useEffect(() => {
    const checkLoggedInUser = async () => {
      const token = getAuthToken();
      if (token) {
        // We must set the header here before calling loadUser
        // because the page might have just refreshed.
        setAuthToken(token); 
        try {
          // Verify the token by fetching user data
          const userData = await authService.loadUser();
          setUser(userData);
          setIsAuthenticated(true);
        } catch (error) {
          // Token is invalid or expired
          console.error("Session expired or invalid:", error);
          authService.logout(); // Cleans up token
          setIsAuthenticated(false);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    checkLoggedInUser();
  }, []);

  const login = async (email, password) => {
    try {
      // authService.login handles the API call AND sets the token
      const data = await authService.login(email, password);
      setUser(data.user);
      setIsAuthenticated(true);
      return data;
    } catch (error) {
      console.error('Login failed', error);
      setIsAuthenticated(false);
      setUser(null);
      throw error;
    }
  };

  const signup = async (name, email, password) => {
    try {
      // authService.signup handles the API call AND sets the token
      const data = await authService.signup(name, email, password);
      setUser(data.user);
      setIsAuthenticated(true);
      return data;
    } catch (error) {
      console.error('Signup failed', error);
      setIsAuthenticated(false);
      setUser(null);
      throw error;
    }
  };

  const logout = () => {
    authService.logout(); // Removes token from storage and headers
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    signup,
    logout,
  };

  // Show a global loader while we check auth status
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <Loader size="lg" />
      </div>
    );
  }

  // Once loading is false, render the app
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};