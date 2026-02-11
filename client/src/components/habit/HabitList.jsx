import React from 'react';
import HabitItem from './HabitItem.jsx';

/**
 * Gets the current day index (Monday=0, Sunday=6).
 * new Date().getDay() returns Sunday=0, so we adjust.
 * @returns {number} 0 for Monday, 6 for Sunday
 */
const getTodayIndex = () => {
  const jsDay = new Date().getDay(); // Sunday is 0, Saturday is 6
  return jsDay === 0 ? 6 : jsDay - 1; // Monday is 0, Sunday is 6
};

/**
 * A component that displays a list of habits.
 * It filters habits to show only those scheduled for "today".
 *
 * @param {object} props
 * @param {string} props.title - The title for the list (e.g., "Today's Habits").
 * @param {Array<object>} props.habits - The full list of user's habits.
 * @param {object} props.completions - An object tracking today's completions.
 * @param {function} props.onCheckIn - Function to call when a habit is checked in.
 * @param {function} [props.onUncheck] - Function to call when unchecking a habit.
 * @param {function} [props.onEdit] - Function to call when editing a habit.
 * @param {function} [props.onDelete] - Function to call when deleting a habit.
 */
const HabitList = ({ 
  title, 
  habits = [], 
  completions = {}, 
  onCheckIn,
  onUncheck,
  onEdit,
  onArchive,
  onDelete,
}) => {
  const todayIndex = getTodayIndex();

  // Note: The backend already filters habits to only return those due today,
  // so this client-side filtering is mainly for safety/edge cases.
  // The backend uses the same day convention: 0=Monday, 6=Sunday
  const habitsForToday = habits.filter((habit) => {
    // Handle daily habits
    if (habit.frequency?.type === 'daily') {
      return true;
    }
    // Handle specific day habits - days is an array of day numbers (0-6), not booleans
    if (habit.frequency?.type === 'specific' || habit.frequency?.type === 'specific_days') {
      return habit.frequency.days && Array.isArray(habit.frequency.days) && habit.frequency.days.includes(todayIndex);
    }
    // Default: don't show if frequency type is unknown
    return false;
  });

  // Separate habits into incomplete and completed
  const incompleteHabits = [];
  const completedHabits = [];

  habitsForToday.forEach((habit) => {
    const completionData = completions[habit._id] || {};
    const isCompleted = habit.goal?.type === 'target'
      ? (completionData.progress || 0) >= (habit.goal?.target || 1)
      : completionData.completed || false;
    
    if (isCompleted) {
      completedHabits.push(habit);
    } else {
      incompleteHabits.push(habit);
    }
  });

  const totalCompleted = completedHabits.length;
  const totalHabits = habitsForToday.length;

  return (
    <div className="w-full">
      {/* Title with habit count */}
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {title}
        </h2>
        {habitsForToday.length > 0 && (
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {totalCompleted} / {totalHabits} completed
          </span>
        )}
      </div>

      {/* Habit list or empty state */}
      {habitsForToday.length > 0 ? (
        <div className="space-y-6">
          {/* INCOMPLETE HABITS SECTION */}
          {incompleteHabits.length > 0 && (
            <div className="space-y-3">
              {incompleteHabits.map((habit) => {
                const completionData = completions[habit._id] || {};
                const isCompleted = completionData.completed || false;
                const currentProgress = completionData.progress || 0;

                return (
                  <HabitItem
                    key={habit._id}
                    habit={habit}
                    onCheckIn={onCheckIn}
                    onUncheck={onUncheck}
                    onEdit={onEdit}
                    onArchive={onArchive}
                    onDelete={onDelete}
                    isCompleted={isCompleted}
                    currentProgress={currentProgress}
                  />
                );
              })}
            </div>
          )}

          {/* SEPARATOR - Only show if there are completed habits */}
          {completedHabits.length > 0 && (
            <div className="relative py-4">
              {/* Divider line */}
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t-2 border-gray-300 dark:border-gray-700"></div>
              </div>
              
              {/* Label */}
              <div className="relative flex justify-center">
                <span className="px-4 py-1.5 bg-white dark:bg-gray-900 text-sm font-semibold text-gray-600 dark:text-gray-400 rounded-full border-2 border-gray-300 dark:border-gray-700">
                  ✓ COMPLETED TODAY ({completedHabits.length})
                </span>
              </div>
            </div>
          )}

          {/* COMPLETED HABITS SECTION */}
          {completedHabits.length > 0 && (
            <div className="space-y-3 opacity-75">
              {completedHabits.map((habit) => {
                const completionData = completions[habit._id] || {};
                const isCompleted = completionData.completed || 
                  (habit.goal?.type === 'target' && (completionData.progress || 0) >= (habit.goal?.target || 1));
                const currentProgress = completionData.progress || 0;

                return (
                  <HabitItem
                    key={habit._id}
                    habit={habit}
                    onCheckIn={onCheckIn}
                    onUncheck={onUncheck}
                    onEdit={onEdit}
                    onArchive={onArchive}
                    onDelete={onDelete}
                    isCompleted={isCompleted}
                    currentProgress={currentProgress}
                  />
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 mb-4">
            <svg
              className="w-8 h-8 text-gray-400 dark:text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">
            No habits scheduled for today
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Add a new habit or adjust your schedule to get started!
          </p>
        </div>
      )}
    </div>
  );
};

export default HabitList;