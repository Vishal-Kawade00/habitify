import { useEffect, useCallback } from 'react';

/**
 * Hook to automatically refresh data at midnight
 * 
 * @param {function} refreshCallback - Function to call when midnight is reached
 * @param {Array} [dependencies] - Dependencies for the refresh callback (optional)
 */
const useMidnightRefresh = (refreshCallback, dependencies = []) => {
  const calculateMsUntilMidnight = useCallback(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0); // Next midnight
    
    return midnight.getTime() - now.getTime();
  }, []);

  const scheduleRefresh = useCallback(() => {
    const msUntilMidnight = calculateMsUntilMidnight();
    
    // Set timeout for midnight
    const timeoutId = setTimeout(() => {
      // Execute refresh callback
      refreshCallback();
      
      // Schedule next refresh (24 hours later)
      scheduleRefresh();
    }, msUntilMidnight);

    return timeoutId;
  }, [calculateMsUntilMidnight, refreshCallback, ...dependencies]);

  useEffect(() => {
    // Schedule first refresh
    const timeoutId = scheduleRefresh();

    // Cleanup on unmount
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [scheduleRefresh]);
};

export default useMidnightRefresh;

