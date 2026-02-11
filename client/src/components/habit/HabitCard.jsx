import React, { useState } from 'react';
import { Calendar, Check, Clock } from 'lucide-react';
import ArchiveConfirmDialog from './ArchiveConfirmDialog.jsx';

/**
 * HabitCard - Displays a single habit with date information
 * 
 * @param {object} props
 * @param {object} props.habit - The habit object
 * @param {boolean} [props.isCompleted] - Whether the habit is completed today
 * @param {number} [props.currentProgress] - Current progress value (for target goals)
 * @param {function} [props.onCheckIn] - Callback when checking in
 * @param {function} [props.onUncheck] - Callback when unchecking
 * @param {function} [props.onEdit] - Callback when editing
 * @param {function} [props.onDelete] - Callback when deleting
 */
const HabitCard = ({
  habit,
  isCompleted = false,
  currentProgress = 0,
  onCheckIn,
  onUncheck,
  onEdit,
  onDelete,
}) => {
  const { _id, name, color, goal, frequency, startDate, endDate } = habit;
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Check if habit is within date range
  const isActiveOnDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (today < start) return false;
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (today > end) return false;
    }

    return true;
  };

  const isActive = isActiveOnDate();
  const isTargetGoal = goal?.type === 'target';

  // Get date range info
  const getDateInfo = () => {
    const hasStart = !!startDate;
    const hasEnd = !!endDate;
    
    if (!hasStart && !hasEnd) {
      return null; // No date restrictions
    }

    if (hasStart && hasEnd) {
      return {
        text: `${formatDate(startDate)} - ${formatDate(endDate)}`,
        status: isActive ? 'active' : 'inactive',
      };
    }

    if (hasStart) {
      return {
        text: `Starts ${formatDate(startDate)}`,
        status: isActive ? 'active' : 'upcoming',
      };
    }

    if (hasEnd) {
      return {
        text: `Ends ${formatDate(endDate)}`,
        status: isActive ? 'active' : 'ended',
      };
    }

    return null;
  };

  const dateInfo = getDateInfo();

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm transition-all hover:shadow-md border border-gray-200 dark:border-gray-700">
      {/* Color bar indicator */}
      <div
        className="w-full h-1 rounded-t-lg mb-3"
        style={{ backgroundColor: color }}
      />

      {/* Habit name and info */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {name}
          </h3>
          
          {/* Date range info */}
          {dateInfo && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 mt-1">
              <Calendar size={12} />
              <span
                className={
                  dateInfo.status === 'active'
                    ? 'text-green-600 dark:text-green-400'
                    : dateInfo.status === 'upcoming'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-500'
                }
              >
                {dateInfo.text}
              </span>
            </div>
          )}

          {/* Frequency info */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-1">
            <Clock size={12} />
            <span>
              {frequency?.type === 'daily'
                ? 'Daily'
                : frequency?.type === 'specific' || frequency?.type === 'specific_days'
                ? `${frequency.days?.length || 0} days/week`
                : 'Custom'}
            </span>
          </div>
        </div>
      </div>

      {/* Progress indicator (for target goals) */}
      {isTargetGoal && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>
              {currentProgress} / {goal?.target || 1} {goal?.unit || 'times'}
            </span>
            <span>{Math.round((currentProgress / (goal?.target || 1)) * 100)}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min((currentProgress / (goal?.target || 1)) * 100, 100)}%`,
                backgroundColor: color,
              }}
            />
          </div>
        </div>
      )}

      {/* Status badge */}
      {!isActive && (
        <div className="mb-3 px-2 py-1 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-700 dark:text-yellow-300">
          {startDate && new Date(startDate) > new Date() ? 'Starts soon' : 'Ended'}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        {isCompleted ? (
          <button
            onClick={() => onUncheck && onUncheck(habit)}
            className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors text-sm font-medium"
            title="Uncheck habit for today"
          >
            <Check size={16} strokeWidth={2.5} />
            Completed
          </button>
        ) : (
          <button
            onClick={() => onCheckIn && onCheckIn(habit)}
            disabled={!isActive}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
              isActive
                ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
            title={isActive ? 'Check in' : 'Habit is not active today'}
          >
            <Check size={16} strokeWidth={2.5} />
            Check In
          </button>
        )}

        {onEdit && (
          <button
            onClick={() => onEdit(habit)}
            className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm"
            title="Edit habit"
          >
            Edit
          </button>
        )}

        {onDelete && (
          <button
            onClick={() => setShowArchiveDialog(true)}
            className="px-3 py-2 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors text-sm"
            title="Archive habit"
          >
            Archive
          </button>
        )}
      </div>

      {/* Archive Confirmation Dialog */}
      <ArchiveConfirmDialog
        isOpen={showArchiveDialog}
        onClose={() => setShowArchiveDialog(false)}
        onConfirm={(habitToArchive) => {
          if (onDelete) {
            onDelete(habitToArchive);
          }
        }}
        habit={habit}
      />
    </div>
  );
};

export default HabitCard;

