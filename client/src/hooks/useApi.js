import { useState, useCallback } from 'react';

/**
 * A generic hook to handle API calls with loading and error states.
 * @param {function} apiFunc - The API service function to call (e.g., habitService.getHabitStats)
 */
export const useApi = (apiFunc) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Executes the API call.
   * Any arguments passed to this function will be forwarded to the original apiFunc.
   */
  const request = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const result = await apiFunc(...args);
        setData(result);
        return { data: result, error: null };
      } catch (err) {
        // Try to get a specific error message from the server response
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          'An unexpected error occurred';
        setError(errorMessage);
        return { data: null, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [apiFunc] // Re-create this function only if the apiFunc prop changes
  );

  return {
    data,
    loading,
    error,
    request,
  };
};
