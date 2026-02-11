import React from 'react';
import { Archive, X } from 'lucide-react';
import Button from '../common/Button.jsx';

/**
 * ArchiveConfirmDialog - Confirmation dialog for archiving habits
 * 
 * @param {object} props
 * @param {boolean} props.isOpen - Whether the dialog is open
 * @param {function} props.onClose - Function to close the dialog
 * @param {function} props.onConfirm - Function to call when user confirms
 * @param {object} props.habit - The habit to archive
 */
const ArchiveConfirmDialog = ({ isOpen, onClose, onConfirm, habit }) => {
  if (!isOpen || !habit) return null;

  const handleConfirm = () => {
    onConfirm(habit);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-40 transition-opacity"
        onClick={handleCancel}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-w-md w-full p-6 transform transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Archive className="text-orange-600 dark:text-orange-400" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Archive Habit
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Are you sure you want to archive this habit?
              </p>
            </div>
            <button
              onClick={handleCancel}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Close dialog"
            >
              <X size={20} />
            </button>
          </div>

          {/* Habit Info */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div
                className="w-2 h-8 rounded-full shrink-0"
                style={{ backgroundColor: habit.color || '#3b82f6' }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white truncate">
                  {habit.name}
                </p>
              </div>
            </div>
          </div>

          {/* Message */}
          <div className="mb-6">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Archiving this habit will:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400 list-disc list-inside">
              <li>Remove it from your dashboard</li>
              <li>Preserve all completion history</li>
              <li>Allow you to restore it later</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
            <Button
              onClick={handleCancel}
              variant="secondary"
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              variant="primary"
              className="w-full sm:w-auto flex items-center justify-center gap-2"
              style={{
                backgroundColor: '#f97316',
                borderColor: '#f97316',
              }}
            >
              <Archive size={16} />
              Archive Habit
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ArchiveConfirmDialog;

