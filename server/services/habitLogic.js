const Habit = require('../models/Habit.js');
const Completion = require('../models/Completion.js');

/**
 * Check if a habit is active on a specific date
 * @param {object} habit - The habit object
 * @param {Date} date - The date to check (defaults to today)
 * @returns {boolean}
 */
function isHabitActiveOnDate(habit, date = new Date()) {
  // Check if habit is archived
  if (habit.isActive === false) {
    return false;
  }

  // Check start date
  if (habit.startDate) {
    const start = new Date(habit.startDate);
    start.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    if (checkDate < start) {
      return false;
    }
  }

  // Check end date
  if (habit.endDate) {
    const end = new Date(habit.endDate);
    end.setHours(23, 59, 59, 999);
    const checkDate = new Date(date);
    checkDate.setHours(23, 59, 59, 999);
    
    if (checkDate > end) {
      return false;
    }
  }

  return true;
}

/**
 * Check if a habit is due today
 * @param {object} habit - The habit object
 * @param {Date} [today] - Optional date to check (defaults to today)
 * @returns {boolean}
 */
function isHabitDueToday(habit, today = new Date()) {
  // First check if habit is active on this date
  if (!isHabitActiveOnDate(habit, today)) {
    return false;
  }

  // Get day of week (JavaScript: 0=Sunday, 6=Saturday)
  const jsDayOfWeek = today.getDay();
  // Convert to our convention: 0=Monday, 6=Sunday
  const dayOfWeek = jsDayOfWeek === 0 ? 6 : jsDayOfWeek - 1;

  // Check frequency
  if (habit.frequency?.type === 'daily') {
    return true;
  }

  if (habit.frequency?.type === 'specific' || habit.frequency?.type === 'specific_days') {
    if (!habit.frequency.days || !Array.isArray(habit.frequency.days)) {
      return false;
    }
    return habit.frequency.days.includes(dayOfWeek);
  }

  return false;
}

/**
 * Get all habits that are due today
 * @returns {Promise<Array>} Array of habit objects
 */
async function getTodaysDueHabits() {
  try {
    const today = new Date();
    // Only get active habits that are not deleted
    const habits = await Habit.find({ 
      isActive: true,
      deletedAt: null // Exclude deleted habits
    });
    
    return habits.filter(habit => isHabitDueToday(habit, today));
  } catch (err) {
    console.error('Error in getTodaysDueHabits:', err);
    throw err;
  }
}

/**
 * Get all habits that are due on a specific date
 * @param {Date} date - The date to check
 * @returns {Promise<Array>} Array of habit objects
 */
async function getDueHabitsOnDate(date) {
  try {
    const habits = await Habit.find({ isActive: true });
    
    return habits.filter(habit => {
      if (!isHabitActiveOnDate(habit, date)) {
        return false;
      }

      const jsDayOfWeek = date.getDay();
      const dayOfWeek = jsDayOfWeek === 0 ? 6 : jsDayOfWeek - 1;

      if (habit.frequency?.type === 'daily') {
        return true;
      }

      if (habit.frequency?.type === 'specific' || habit.frequency?.type === 'specific_days') {
        if (!habit.frequency.days || !Array.isArray(habit.frequency.days)) {
          return false;
        }
        return habit.frequency.days.includes(dayOfWeek);
      }

      return false;
    });
  } catch (err) {
    console.error('Error in getDueHabitsOnDate:', err);
    throw err;
  }
}

/**
 * Check if a habit is due on a specific date (similar to isHabitDueToday but for any date)
 * @param {object} habit - The habit object
 * @param {Date} date - The date to check
 * @returns {boolean}
 */
function isHabitDueOnDate(habit, date) {
  // First check if habit is active on this date
  if (!isHabitActiveOnDate(habit, date)) {
    return false;
  }

  // Get day of week (JavaScript: 0=Sunday, 6=Saturday)
  const jsDayOfWeek = date.getDay();
  // Convert to our convention: 0=Monday, 6=Sunday
  const dayOfWeek = jsDayOfWeek === 0 ? 6 : jsDayOfWeek - 1;

  // Check frequency
  if (habit.frequency?.type === 'daily') {
    return true;
  }

  if (habit.frequency?.type === 'specific' || habit.frequency?.type === 'specific_days') {
    if (!habit.frequency.days || !Array.isArray(habit.frequency.days)) {
      return false;
    }
    return habit.frequency.days.includes(dayOfWeek);
  }

  return false;
}

module.exports = {
  isHabitActiveOnDate,
  isHabitDueToday,
  isHabitDueOnDate,
  getTodaysDueHabits,
  getDueHabitsOnDate,
};

