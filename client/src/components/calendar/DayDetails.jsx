import React from 'react';
import { Check, Clock, Target, Calendar as CalendarIcon } from 'lucide-react';
import HabitCard from '../habit/HabitCard.jsx';

/**
 * DayDetails - Displays details for a selected date
 * 
 * @param {object} props
 * @param {object} props.dateData - Data for the selected date from API
 * @param {boolean} props.isLoading - Whether data is loading
 */
const DayDetails = ({ dateData, isLoading }) => {
  if (isLoading) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="space-y-2">
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!dateData) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-center">
        <CalendarIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">
          Select a date to view details
        </p>
      </div>
    );
  }

  const { date, isPast, isToday, isFuture, habitsCount, completedCount, completionRate, habits } = dateData;

  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Separate completed and incomplete habits for past dates
  const completedHabits = habits?.filter(h => h.completed) || [];
  const incompleteHabits = habits?.filter(h => !h.completed) || [];

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {formattedDate}
        </h2>
        
        {/* Status Badge */}
        <div className="flex items-center gap-2 mb-4">
          {isToday && (
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
              Today
            </span>
          )}
          {isPast && !isToday && (
            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium">
              Past Date
            </span>
          )}
          {isFuture && (
            <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium">
              Future Date
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
              <Target size={16} />
              <span>Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {habitsCount}
            </p>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 mb-1">
              <Check size={16} />
              <span>Completed</span>
            </div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {completedCount}
            </p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 mb-1">
              <Clock size={16} />
              <span>Rate</span>
            </div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {completionRate}%
            </p>
          </div>
        </div>
      </div>

      {/* Habits List */}
      {isPast && !isToday && (
        <>
          {completedHabits.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Check size={20} className="text-green-600 dark:text-green-400" />
                Completed Habits
              </h3>
              <div className="space-y-3">
                {completedHabits.map(habit => (
                  <HabitCard
                    key={habit._id}
                    habit={habit}
                    isCompleted={true}
                    currentProgress={habit.completionValue || 0}
                  />
                ))}
              </div>
            </div>
          )}

          {incompleteHabits.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Clock size={20} className="text-gray-600 dark:text-gray-400" />
                Not Completed
              </h3>
              <div className="space-y-3">
                {incompleteHabits.map(habit => (
                  <HabitCard
                    key={habit._id}
                    habit={habit}
                    isCompleted={false}
                    currentProgress={0}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {isToday && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Today's Habits
          </h3>
          <div className="space-y-3">
            {habits?.map(habit => (
              <HabitCard
                key={habit._id}
                habit={habit}
                isCompleted={habit.completed}
                currentProgress={habit.completionValue || 0}
              />
            ))}
          </div>
        </div>
      )}

      {isFuture && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <CalendarIcon size={20} className="text-purple-600 dark:text-purple-400" />
            Scheduled Habits
          </h3>
          {habitsCount > 0 ? (
            <div className="space-y-3">
              {habits?.map(habit => (
                <HabitCard
                  key={habit._id}
                  habit={habit}
                  isCompleted={false}
                  currentProgress={0}
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">
              No habits scheduled for this date.
            </p>
          )}
        </div>
      )}

      {habitsCount === 0 && (
        <div className="text-center py-8">
          <CalendarIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            No habits scheduled for this date.
          </p>
        </div>
      )}
    </div>
  );
};

export default DayDetails;


