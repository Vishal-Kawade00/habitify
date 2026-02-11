const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // <--- Import Middleware

// Import all controller functions from habitController
const {
  getAllHabits,
  createHabit,
  getHabitById,
  updateHabit,
  deleteHabit,
  archiveHabit,
  logCompletion,
  getHabitStats,
  getHabitCompletions,
  getHabitsSummary,
  getTodaysDueHabits,
  restoreHabit,
  getArchivedHabits,
  getHabitsForDate,
  getMonthHeatmap,
  cleanupDeletedHabits,
} = require('../controllers/habitController.js');

// ==========================================
// SPECIFIC ROUTES (Must come before parameter routes)
// ==========================================

// @route   GET /api/habits/summary
// @desc    Get summary of all habits with their completion status
// @access  Private
// NOTE: Must come BEFORE /:id routes to avoid matching "summary" as an ID
router.get('/summary', auth, getHabitsSummary);

// @route   GET /api/habits/due-today
// @desc    Get habits that are due today (respects frequency and date ranges)
// @access  Private
router.get('/due-today', auth, getTodaysDueHabits);

// @route   GET /api/habits/archived
// @desc    Get all archived habits
// @access  Private
router.get('/archived', auth, getArchivedHabits);

// @route   POST /api/habits/cleanup
// @desc    Permanently delete habits deleted more than 1 month ago
// @access  Private
router.post('/cleanup', auth, cleanupDeletedHabits);

// @route   GET /api/habits/calendar/date/:date
// @desc    Get habits and completions for a specific date (YYYY-MM-DD)
// @access  Private
router.get('/calendar/date/:date', auth, getHabitsForDate);

// @route   GET /api/habits/calendar/month/:year/:month
// @desc    Get calendar heatmap data for a month
// @access  Private
router.get('/calendar/month/:year/:month', auth, getMonthHeatmap);

// ==========================================
// HABIT CRUD OPERATIONS
// ==========================================

// @route   GET /api/habits
// @desc    Get all habits for the user
// @access  Private
router.get('/', auth, getAllHabits);

// @route   POST /api/habits
// @desc    Create a new habit
// @access  Private
router.post('/', auth, createHabit);

// ==========================================
// HABIT COMPLETION OPERATIONS (Specific routes before :id)
// ==========================================

// @route   POST /api/habits/:id/complete
// @desc    Log a new completion for a specific habit
// @body    { value: number } - The completion value (1 for yes/no, custom for targets)
// @access  Private
// NOTE: More specific routes must come before /:id to ensure proper matching
router.post('/:id/complete', auth, logCompletion);

// @route   POST /api/habits/:id/archive
// @desc    Archive a habit (set isActive to false)
// @access  Private
router.post('/:id/archive', auth, archiveHabit);

// @route   POST /api/habits/:id/restore
// @desc    Restore an archived habit
// @access  Private
router.post('/:id/restore', auth, restoreHabit);

// @route   GET /api/habits/:id/completions
// @desc    Get all completions for a specific habit
// @access  Private
router.get('/:id/completions', auth, getHabitCompletions);

// @route   GET /api/habits/:id/stats
// @desc    Get statistics for a specific habit (streaks, heatmap, charts)
// @returns { currentStreak, longestStreak, heatmapData, chartData }
// @access  Private
router.get('/:id/stats', auth, getHabitStats);

// ==========================================
// HABIT BY ID OPERATIONS (General routes come last)
// ==========================================

// @route   GET /api/habits/:id
// @desc    Get a single habit by its ID
// @access  Private
router.get('/:id', auth, getHabitById);

// @route   PUT /api/habits/:id
// @desc    Update a habit's details (name, color, frequency, goal, etc.)
// @access  Private
router.put('/:id', auth, updateHabit);

// @route   DELETE /api/habits/:id
// @desc    Archive a habit (soft delete - preserves data)
// @access  Private
router.delete('/:id', auth, deleteHabit);

module.exports = router;