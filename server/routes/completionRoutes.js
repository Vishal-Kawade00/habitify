const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // <--- Import Middleware

// Import completion controller functions
const {
  getTodayCompletions,
  deleteCompletion,
  getCompletionsByRange,
} = require('../controllers/completionController.js');

// ==========================================
// COMPLETION ROUTES
// ==========================================

// @route   GET /api/completions/today
// @desc    Get all completions for today
// @access  Private
router.get('/today', auth, getTodayCompletions);

// @route   GET /api/completions
// @desc    Get completions by date range or habit
// @query   startDate, endDate, habitId (optional)
// @access  Private
router.get('/', auth, getCompletionsByRange);

// @route   DELETE /api/completions/:id
// @desc    Delete a specific completion
// @access  Private
router.delete('/:id', auth, deleteCompletion);

module.exports = router;