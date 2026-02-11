import React, { useState, useEffect, useContext } from 'react';
import { HabitContext } from '../context/HabitContext.jsx';
import Button from '../components/common/Button.jsx';
import Loader from '../components/common/Loader.jsx';
import { Archive, RotateCcw, Trash2 } from 'lucide-react';
import * as habitService from '../services/habitService.js';

const ArchivedHabitsPage = () => {
  const [archivedHabits, setArchivedHabits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { restoreArchivedHabit } = useContext(HabitContext);

  useEffect(() => {
    fetchArchivedHabits();
  }, []);

  const fetchArchivedHabits = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const habits = await habitService.getArchivedHabits();
      setArchivedHabits(Array.isArray(habits) ? habits : []);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch archived habits';
      setError(errorMessage);
      console.error('Failed to fetch archived habits:', err);
      setArchivedHabits([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (habit) => {
    try {
      await restoreArchivedHabit(habit._id);
      // Remove from archived list
      setArchivedHabits(prev => prev.filter(h => h._id !== habit._id));
    } catch (err) {
      console.error('Error restoring habit:', err);
      setError(err.response?.data?.message || err.message || 'Failed to restore habit');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <Archive className="text-gray-600 dark:text-gray-400" size={24} />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                Archived Habits
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                View and restore your archived habits
              </p>
            </div>
          </div>
        </header>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader size="lg" />
          </div>
        ) : archivedHabits.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 mb-6">
              <Archive className="w-10 h-10 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              No archived habits
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              When you archive a habit, it will appear here. You can restore archived habits at any time.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {archivedHabits.map((habit) => (
              <div
                key={habit._id}
                className="p-5 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
              >
                {/* Color bar */}
                <div
                  className="w-full h-1 rounded-t-lg mb-4"
                  style={{ backgroundColor: habit.color || '#3b82f6' }}
                />

                {/* Habit Info */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {habit.name}
                    </h3>
                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <p>
                        <span className="font-medium">Frequency:</span>{' '}
                        {habit.frequency?.type === 'daily'
                          ? 'Daily'
                          : habit.frequency?.type === 'specific' || habit.frequency?.type === 'specific_days'
                          ? `${habit.frequency.days?.length || 0} days/week`
                          : 'Custom'}
                      </p>
                      <p>
                        <span className="font-medium">Goal:</span>{' '}
                        {habit.goal?.type === 'yes_no'
                          ? 'Yes/No'
                          : `Target: ${habit.goal?.target || 1} ${habit.goal?.unit || 'times'}`}
                      </p>
                      <p>
                        <span className="font-medium">Archived:</span>{' '}
                        {formatDate(habit.updatedAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    onClick={() => handleRestore(habit)}
                    variant="primary"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <RotateCcw size={16} />
                    Restore
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArchivedHabitsPage;

