import React, { createContext, useState, useContext, useEffect } from 'react';
import * as habitService from '../services/habitService.js';
import { useAuth } from './AuthContext'; // <--- Import useAuth

// 1. Create the context
const HabitContext = createContext();

// 2. Create a custom hook to make it easy to use the context
export const useHabits = () => {
  const context = useContext(HabitContext);
  if (!context) {
    throw new Error('useHabits must be used within a HabitProvider');
  }
  return context;
};

// Helper function to get today's date string (YYYY-MM-DD)
const getTodayDateString = () => {
  return new Date().toISOString().split('T')[0];
};

// Helper function to organize completions by habit ID and date
const organizeCompletions = (completionsArray) => {
  if (!Array.isArray(completionsArray)) {
    return {};
  }

  const today = getTodayDateString();
  const organized = {};

  completionsArray.forEach((completion) => {
    // Handle both populated and non-populated habit references
    const habitId = completion.habit?._id || completion.habit || completion.habitId;
    if (!habitId) return;

    const completionDate = new Date(completion.date).toISOString().split('T')[0];
    
    // Only include today's completions in the organized object
    if (completionDate === today) {
      if (!organized[habitId]) {
        organized[habitId] = {
          completed: false,
          progress: 0,
        };
      }
      
      // Mark as completed or add to progress
      const completionValue = completion.value !== undefined ? completion.value : 1;
      
      // For yes/no habits (value = 1), mark as completed
      if (completionValue === 1) {
        organized[habitId].completed = true;
        organized[habitId].progress = 1;
      } else {
        // For target habits, accumulate progress
        organized[habitId].progress += completionValue;
      }
    }
  });

  return organized;
};

// 3. Create the Provider component (which will wrap our app)
export const HabitProvider = ({ children }) => {
  const { isAuthenticated } = useAuth(); // <--- Access Auth State
  const [habits, setHabits] = useState([]);
  const [completions, setCompletions] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initial data fetch - Controlled by Auth State
  useEffect(() => {
    const loadData = async () => {
      // 1. If not logged in, clear data and stop loading
      if (!isAuthenticated) {
        setHabits([]);
        setCompletions({});
        setIsLoading(false);
        return;
      }

      // 2. If logged in, fetch data
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch all active habits and today's completions in parallel
        const [habitsData, completionsData] = await Promise.all([
          habitService.getHabits(),
          habitService.getTodayCompletions(),
        ]);
        
        // Ensure we have arrays
        const habitsArray = Array.isArray(habitsData) ? habitsData : [];
        const completionsArray = Array.isArray(completionsData) ? completionsData : [];
        
        setHabits(habitsArray);
        setCompletions(organizeCompletions(completionsArray));
      } catch (err) {
        const errorMessage = err.response?.data?.message || err.message || 'Failed to load data';
        setError(errorMessage);
        console.error('Failed to fetch initial data:', err);
        setHabits([]);
        setCompletions({});
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated]); // <--- Re-run when auth state changes (login/logout)

  // Refresh completions at midnight (Only if authenticated)
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkForNewDay = () => {
      const now = new Date();
      const msUntilMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0, 0, 0
      ).getTime() - now.getTime();

      const timeoutId = setTimeout(() => {
        refreshCompletions();
        checkForNewDay();
      }, msUntilMidnight);

      return timeoutId;
    };

    const timeoutId = checkForNewDay();
    return () => clearTimeout(timeoutId);
  }, [isAuthenticated]);

  // --- Actions ---

  /**
   * Adds a new habit to the database and updates the state.
   * IMPORTANT: Does NOT refresh completions - preserves existing completion state
   */
  const addHabit = async (habitData) => {
    try {
      setError(null);
      const newHabit = await habitService.createHabit(habitData);
      
      if (newHabit && newHabit._id) {
        // Add new habit to the beginning of the list
        setHabits((prevHabits) => [newHabit, ...prevHabits]);
        
        // DO NOT refresh completions - this preserves existing completion state
        // The new habit won't have any completions yet anyway
        
        return newHabit;
      } else {
        throw new Error('Invalid habit data received from server');
      }
    } catch (err) {
      console.error('Failed to add habit:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create habit';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Updates an existing habit.
   */
  const updateHabit = async (habitId, habitData) => {
    try {
      setError(null);
      const updatedHabit = await habitService.updateHabit(habitId, habitData);
      setHabits((prevHabits) =>
        prevHabits.map((h) => (h._id === habitId ? updatedHabit : h))
      );
      return updatedHabit;
    } catch (err) {
      console.error('Failed to update habit:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update habit';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Checks in a habit (logs completion or adds progress).
   * FIXED: Prevents double-counting by using optimistic update strategy
   */
  const checkInHabit = async (habitId, value = 1) => {
    // Get the habit to check its goal type BEFORE the API call
    const habit = habits.find((h) => h._id === habitId);
    if (!habit) {
      throw new Error('Habit not found');
    }

    const isTargetGoal = habit.goal?.type === 'target';
    const goalTarget = habit.goal?.target || 1;

    // Optimistically update UI first (prevents double-counting)
    setCompletions((prev) => {
      const updated = { ...prev };
      if (!updated[habitId]) {
        updated[habitId] = { completed: false, progress: 0 };
      }
      
      // Calculate new progress
      const newProgress = (updated[habitId].progress || 0) + value;
      updated[habitId].progress = newProgress;
      
      // Determine completion status
      if (isTargetGoal) {
        updated[habitId].completed = newProgress >= goalTarget;
      } else {
        updated[habitId].completed = true;
      }
      
      return updated;
    });

    // Then make the API call
    try {
      const completion = await habitService.logCompletion(habitId, value);
      return completion;
    } catch (err) {
      // Revert the optimistic update on error
      setCompletions((prev) => {
        const updated = { ...prev };
        if (updated[habitId]) {
          const revertedProgress = Math.max(0, (updated[habitId].progress || 0) - value);
          updated[habitId].progress = revertedProgress;
          
          if (isTargetGoal) {
            updated[habitId].completed = revertedProgress >= goalTarget;
          } else {
            updated[habitId].completed = revertedProgress >= 1;
          }
        }
        return updated;
      });
      
      console.error('Failed to check in habit:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to log completion';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Unchecks a habit (removes today's completion).
   */
  const uncheckHabit = async (habitId) => {
    try {
      setError(null);
      
      // Get today's completion for this habit
      const completionsData = await habitService.getTodayCompletions();
      const todayCompletion = completionsData.find(
        (c) => (c.habit?._id || c.habit) === habitId
      );

      if (todayCompletion && todayCompletion._id) {
        await habitService.deleteCompletion(todayCompletion._id);
      }

      // Update local state
      setCompletions((prev) => {
        const updated = { ...prev };
        delete updated[habitId]; // Remove the entry completely
        return updated;
      });

      return true;
    } catch (err) {
      console.error('Failed to uncheck habit:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to remove completion';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Archives a habit (sets isActive to false).
   */
  const archiveHabit = async (habitId) => {
    try {
      setError(null);
      await habitService.archiveHabit(habitId);
      
      setHabits((prev) => prev.filter((h) => h._id !== habitId));
      
      setCompletions((prev) => {
        const updated = { ...prev };
        delete updated[habitId];
        return updated;
      });
      
      return true;
    } catch (err) {
      console.error('Failed to archive habit:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to archive habit';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Deletes a habit (soft delete).
   */
  const deleteHabit = async (habitId) => {
    try {
      setError(null);
      await habitService.deleteHabit(habitId);
      
      setHabits((prev) => prev.filter((h) => h._id !== habitId));
      
      setCompletions((prev) => {
        const updated = { ...prev };
        delete updated[habitId];
        return updated;
      });
      
      return true;
    } catch (err) {
      console.error('Failed to delete habit:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete habit';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Fetches detailed stats for a single habit.
   */
  const getHabitStats = async (habitId) => {
    try {
      return await habitService.getHabitStats(habitId);
    } catch (err) {
      console.error('Failed to get stats:', err);
      const errorMessage = err.message || 'Failed to fetch statistics';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Refreshes today's completions from the server.
   */
  const refreshCompletions = async () => {
    try {
      const completionsData = await habitService.getTodayCompletions();
      const completionsArray = Array.isArray(completionsData) ? completionsData : [];
      setCompletions(organizeCompletions(completionsArray));
    } catch (err) {
      console.error('Failed to refresh completions:', err);
      // Don't set error state for background refreshes
    }
  };

  /**
   * Restores an archived habit.
   */
  const restoreArchivedHabit = async (habitId) => {
    try {
      setError(null);
      const restoredHabit = await habitService.restoreHabit(habitId);
      
      setHabits((prevHabits) => {
        const filtered = prevHabits.filter(h => h._id !== habitId);
        return [restoredHabit.habit, ...filtered];
      });
      
      await refreshCompletions();
      return restoredHabit;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to restore habit';
      setError(errorMessage);
      console.error('Failed to restore habit:', err);
      throw err;
    }
  };

  /**
   * Fetches today's due habits.
   */
  const fetchTodaysDueHabits = async () => {
    try {
      setError(null);
      const habitsData = await habitService.getTodaysDueHabits();
      const habitsArray = Array.isArray(habitsData) ? habitsData : [];
      setHabits(habitsArray);
      await refreshCompletions();
      return habitsArray;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch today\'s habits';
      setError(errorMessage);
      console.error('Failed to fetch today\'s habits:', err);
      setHabits([]);
      throw err;
    }
  };

  /**
   * Clears the current error.
   */
  const clearError = () => {
    setError(null);
  };

  const value = {
    habits,
    completions,
    isLoading,
    error,
    addHabit,
    updateHabit,
    checkInHabit,
    uncheckHabit,
    archiveHabit,
    deleteHabit,
    getHabitStats,
    refreshCompletions,
    clearError,
    restoreArchivedHabit,
    fetchTodaysDueHabits,
  };

  return (
    <HabitContext.Provider value={value}>
      {children}
    </HabitContext.Provider>
  );
};

export { HabitContext };