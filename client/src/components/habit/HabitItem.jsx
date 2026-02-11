import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../common/Button.jsx';
import ArchiveConfirmDialog from './ArchiveConfirmDialog.jsx';
import DeleteConfirmDialog from './DeleteConfirmDialog.jsx';
import { Check, Plus, Edit, Trash2, X, Archive } from 'lucide-react';

/**
 * A single habit item displayed in the Dashboard list.
 *
 * @param {object} props
 * @param {object} props.habit - The habit object to display.
 * @param {function} props.onCheckIn - Function to call when the check-in button is clicked.
 * @param {function} [props.onUncheck] - Function to call when unchecking the habit.
 * @param {function} [props.onEdit] - Function to call when editing the habit.
 * @param {function} [props.onArchive] - Function to call when archiving the habit.
 * @param {function} [props.onDelete] - Function to call when deleting the habit.
 * @param {boolean} props.isCompleted - Whether the habit is already completed for the day.
 * @param {number} props.currentProgress - Current progress for target-based goals.
 */
const HabitItem = ({ 
  habit, 
  onCheckIn, 
  onUncheck,
  onEdit,
  onArchive,
  onDelete,
  isCompleted, 
  currentProgress = 0 
}) => {
  const { _id, name, color, goal } = habit;
  const [showMenu, setShowMenu] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isTargetGoal = goal?.type === 'target';
  const goalTarget = goal?.target || 1;

  // Determine completion for target goals
  const isTargetCompleted = isTargetGoal && currentProgress >= goalTarget;
  const finalIsCompleted = isTargetGoal ? isTargetCompleted : isCompleted;

  return (
    <div className="flex items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm transition-all hover:shadow-md border border-gray-200 dark:border-gray-700">
      {/* Color Bar */}
      <div
        className="w-1 h-12 rounded-full shrink-0"
        style={{ backgroundColor: color || '#3b82f6' }}
      />

      {/* Habit Name and Goal */}
      <div className="flex-1 ml-4 min-w-0">
        <Link
          to={`/habit/${_id}`}
          className="font-semibold text-lg text-gray-800 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors block truncate"
        >
          {name}
        </Link>
        {isTargetGoal && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {currentProgress}
            </span>
            {' / '}
            <span className="text-gray-500 dark:text-gray-400">
              {goalTarget}
            </span>
            {goal.unit && (
              <span className="ml-1 text-gray-500 dark:text-gray-400">
                {goal.unit}
              </span>
            )}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="ml-4 shrink-0 flex items-center gap-2">
        {/* Check-in/Uncheck Button */}
        {finalIsCompleted ? (
          // Completed State - Show uncheck button (clickable to remove completion)
          <button
            onClick={() => onUncheck && onUncheck(habit)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors cursor-pointer"
            aria-label="Uncheck habit for today"
            title="Click to uncheck habit"
          >
            <Check size={20} strokeWidth={2.5} />
          </button>
        ) : (
          // Incomplete State - Check-in Button
          <Button
            variant="primary"
            size="sm"
            onClick={() => onCheckIn(habit)}
            className="w-10 h-10 rounded-full p-0 flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
            style={{
              backgroundColor: color || '#3b82f6',
              borderColor: color || '#3b82f6',
            }}
            aria-label={
              isTargetGoal
                ? `Add progress to ${name}`
                : `Complete habit: ${name}`
            }
          >
            {isTargetGoal ? (
              <Plus size={20} strokeWidth={2.5} />
            ) : (
              <Check size={20} strokeWidth={2.5} />
            )}
          </Button>
        )}

        {/* Menu Button */}
        {(onEdit || onDelete) && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="More options"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="19" r="1" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                  <div className="py-1">
                    {onEdit && (
                      <button
                        onClick={() => {
                          onEdit(habit);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <Edit size={16} />
                        Edit Habit
                      </button>
                    )}
                    {onArchive && (
                      <button
                        onClick={() => {
                          setShowArchiveDialog(true);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center gap-2"
                      >
                        <Archive size={16} />
                        Archive Habit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => {
                          setShowDeleteDialog(true);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                      >
                        <Trash2 size={16} />
                        Delete Habit
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Archive Confirmation Dialog */}
      <ArchiveConfirmDialog
        isOpen={showArchiveDialog}
        onClose={() => setShowArchiveDialog(false)}
        onConfirm={(habitToArchive) => {
          if (onArchive) {
            onArchive(habitToArchive);
          }
        }}
        habit={habit}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={(habitToDelete) => {
          if (onDelete) {
            onDelete(habitToDelete);
          }
        }}
        habit={habit}
      />
    </div>
  );
};

export default HabitItem;