import React, { useState, useEffect } from 'react';
import Button from '../common/Button.jsx';
import { Target, CheckSquare, Calendar, Palette } from 'lucide-react';

// Define constants for colors and days
const habitColors = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#f43f5e', '#14b8a6', '#84cc16', '#a855f7'
];

const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * A form for adding or editing a habit.
 * Designed to be used inside the Modal component.
 *
 * @param {object} props
 * @param {function} props.onCancel - Function to close the modal/cancel the form.
 * @param {function} props.onSubmit - Function to call with form data on submission.
 * @param {object} [props.habit] - The habit object to edit (if any).
 */
const AddHabitForm = ({ onCancel, onSubmit, habit }) => {
  // --- State for all form fields ---
  const [name, setName] = useState('');
  const [color, setColor] = useState(habitColors[0]);
  const [frequencyType, setFrequencyType] = useState('daily'); // 'daily' or 'specific'
  const [specificDays, setSpecificDays] = useState(
    new Array(7).fill(false) // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
  );
  const [goalType, setGoalType] = useState('yes_no'); // 'yes_no' or 'target'
  const [goalTarget, setGoalTarget] = useState(1);
  const [goalUnit, setGoalUnit] = useState('times');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // --- Effect to populate form when editing ---
  useEffect(() => {
    if (habit) {
      setName(habit.name || '');
      setColor(habit.color || habitColors[0]);
      setFrequencyType(habit.frequency?.type || 'daily');
      if ((habit.frequency?.type === 'specific' || habit.frequency?.type === 'specific_days') && habit.frequency?.days) {
        // Convert array of day numbers [0, 2, 4] to boolean array [true, false, true, false, true, false, false]
        const daysArray = new Array(7).fill(false);
        habit.frequency.days.forEach(dayIndex => {
          if (dayIndex >= 0 && dayIndex < 7) {
            daysArray[dayIndex] = true;
          }
        });
        setSpecificDays(daysArray);
      }
      setGoalType(habit.goal?.type || 'yes_no');
      setGoalTarget(habit.goal?.target || 1);
      setGoalUnit(habit.goal?.unit || 'times');
      
      // Date range fields
      let dateToSave;

if (habit.startDate) {
  dateToSave = new Date(habit.startDate).toISOString().split('T')[0];
} else {
  dateToSave = new Date().toISOString().split('T')[0];
}

setStartDate(dateToSave);
      
      if (habit.endDate) {
        const end = new Date(habit.endDate);
        setEndDate(end.toISOString().split('T')[0]);
      } else {
        setEndDate('');
      }
    } else {
      // Reset form when not editing
      setStartDate('');
      setEndDate('');
    }
  }, [habit]);

  // --- Handlers ---
  const handleDayToggle = (index) => {
    const newDays = [...specificDays];
    newDays[index] = !newDays[index];
    setSpecificDays(newDays);
  };

  const validateForm = () => {
    if (!name.trim()) {
      setError('Please enter a habit name');
      return false;
    }

    if (frequencyType === 'specific' && !specificDays.some(day => day)) {
      setError('Please select at least one day');
      return false;
    }

    if (goalType === 'target' && goalTarget < 1) {
      setError('Target must be at least 1');
      return false;
    }

    if (goalType === 'target' && !goalUnit.trim()) {
      setError('Please enter a unit for your target');
      return false;
    }

    // Validate date range
    if(!startDate){
      setStartDate(new Date().toISOString().split('T')[0]);
    }
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start > end) {
        setError('End date must be after start date');
        return false;
      }
    }

    setError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError('');

    try {
      // Convert boolean array to array of selected day indices (0-6)
      const selectedDays = specificDays
        .map((selected, index) => selected ? index : null)
        .filter(day => day !== null);
      
      const frequency =
        frequencyType === 'daily'
          ? { type: 'daily' }
          : { type: 'specific', days: selectedDays };

      const goal =
        goalType === 'yes_no'
          ? { type: 'yes_no' }
          : { type: 'target', target: goalTarget, unit: goalUnit };

      const formData = {
        name: name.trim(),
        color,
        frequency,
        goal,
        startDate: startDate || null,
        endDate: endDate || null,
      };

      // If we are editing, pass the habit ID back
      if (habit) {
        await onSubmit({ ...formData, _id: habit._id });
      } else {
        await onSubmit(formData);
      }
    } catch (err) {
      setError(err.message || 'Failed to save habit. Please try again.');
      setIsSubmitting(false);
    }
  };

  // --- Render ---
  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-6">
      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* 1. Habit Name */}
      <div>
        <label
          htmlFor="habit-name"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Habit Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="habit-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Read for 20 minutes"
          className="block w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          maxLength={50}
          required
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {name.length}/50 characters
        </p>
      </div>

      {/* 2. Habit Color */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          <Palette size={16} />
          Color
        </label>
        <div className="flex flex-wrap gap-2">
          {habitColors.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setColor(c)}
              className={`w-10 h-10 rounded-lg transition-all hover:scale-110 ${
                color === c
                  ? 'ring-2 ring-offset-2 dark:ring-offset-gray-800 ring-blue-500 scale-110'
                  : 'hover:opacity-80'
              }`}
              style={{ backgroundColor: c }}
              aria-label={`Set color to ${c}`}
            />
          ))}
        </div>
      </div>

      {/* 3. Frequency */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          <Calendar size={16} />
          Frequency <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant={frequencyType === 'daily' ? 'primary' : 'secondary'}
            onClick={() => setFrequencyType('daily')}
            className="w-full"
          >
            Daily
          </Button>
          <Button
            type="button"
            variant={frequencyType === 'specific' ? 'primary' : 'secondary'}
            onClick={() => setFrequencyType('specific')}
            className="w-full"
          >
            Specific Days
          </Button>
        </div>

        {/* Specific Days Toggles */}
        {frequencyType === 'specific' && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
              Select the days you want to track this habit:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {daysOfWeek.map((day, index) => (
                <button
                  type="button"
                  key={day}
                  onClick={() => handleDayToggle(index)}
                  className={`w-11 h-11 rounded-lg font-semibold text-sm transition-all ${
                    specificDays[index]
                      ? 'bg-blue-600 text-white shadow-md scale-105'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. Date Range (Optional) */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          <Calendar size={16} />
          Active Period <span className="text-xs text-gray-500">(Optional)</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="start-date"
              className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1"
            >
              Start Date
            </label>
            <input
              type="date"
              id="start-date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]} // Restrict to today or future
              className="block w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="end-date"
              className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1"
            >
              End Date
            </label>
            <input
              type="date"
              id="end-date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="block w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Leave blank to start immediately and continue indefinitely. Set dates to create a time-limited habit.
        </p>
      </div>

      {/* 5. Goal Type */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          <Target size={16} />
          Goal Type <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant={goalType === 'yes_no' ? 'primary' : 'secondary'}
            onClick={() => setGoalType('yes_no')}
            className="w-full flex items-center justify-center gap-2"
          >
            <CheckSquare size={16} />
            Yes/No
          </Button>
          <Button
            type="button"
            variant={goalType === 'target' ? 'primary' : 'secondary'}
            onClick={() => setGoalType('target')}
            className="w-full flex items-center justify-center gap-2"
          >
            <Target size={16} />
            Target
          </Button>
        </div>

        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
          {goalType === 'yes_no' 
            ? 'Simple completion tracking - did you do it or not?'
            : 'Track progress towards a specific target (e.g., 8 glasses of water)'
          }
        </div>

        {/* Goal Target Input */}
        {goalType === 'target' && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="goal-target"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Target <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="goal-target"
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(Math.max(1, parseInt(e.target.value) || 1))}
                  className="block w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                  required={goalType === 'target'}
                />
              </div>
              <div>
                <label
                  htmlFor="goal-unit"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Unit <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="goal-unit"
                  value={goalUnit}
                  onChange={(e) => setGoalUnit(e.target.value)}
                  placeholder="e.g., glasses, pages"
                  className="block w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  maxLength={20}
                  required={goalType === 'target'}
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Example: Target of 8 glasses for tracking water intake
            </p>
          </div>
        )}
      </div>

      {/* 6. Form Actions */}
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button 
          type="button" 
          variant="secondary" 
          onClick={onCancel}
          disabled={isSubmitting}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          variant="primary"
          disabled={isSubmitting}
          className="w-full sm:w-auto"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              {habit ? 'Saving...' : 'Creating...'}
            </>
          ) : (
            habit ? 'Save Changes' : 'Create Habit'
          )}
        </Button>
      </div>
    </form>
  );
};

export default AddHabitForm;