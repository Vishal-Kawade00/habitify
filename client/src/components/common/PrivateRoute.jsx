import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
// CHANGED: Import directly from AuthContext, not from hooks/useAuth
import { useAuth } from '../../context/AuthContext'; 
import Loader from './Loader';

const PrivateRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // 1. Wait for Auth check to finish
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader size="lg" />
      </div>
    );
  }

  // 2. If authenticated, render child routes (Outlet)
  // 3. If not, redirect to Login
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default PrivateRoute;