import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext.js';

/**
 * Custom hook to easily access the AuthContext.
 * This saves us from importing useContext and AuthContext in every component.
 * @returns {object} The authentication context value.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
