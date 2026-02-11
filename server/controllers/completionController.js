const Completion = require('../models/Completion.js');

/**
 * @desc    Get today's completions for all habits
 * @route   GET /api/completions/today
 * @access  Public
 */
exports.getTodayCompletions = async (req, res) => {
  try {
    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get tomorrow's date at midnight for comparison
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find all completions for today
    const completions = await Completion.find({
      date: {
        $gte: today,
        $lt: tomorrow,
      },
    }).populate('habit', 'name color');

    res.status(200).json(completions);
  } catch (err) {
    console.error('Error in getTodayCompletions:', err.message);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch today\'s completions', 
      error: err.message 
    });
  }
};

/**
 * @desc    Delete a specific completion
 * @route   DELETE /api/completions/:id
 * @access  Public
 */
exports.deleteCompletion = async (req, res) => {
  try {
    const completion = await Completion.findById(req.params.id);

    if (!completion) {
      return res.status(404).json({ message: 'Completion not found' });
    }

    await completion.deleteOne();
    res.status(200).json({ 
      success: true,
      message: 'Completion deleted successfully' 
    });
  } catch (err) {
    console.error('Error in deleteCompletion:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ 
        success: false,
        message: 'Completion not found' 
      });
    }
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete completion', 
      error: err.message 
    });
  }
};

/**
 * @desc    Get completions by date range
 * @route   GET /api/completions?startDate=&endDate=
 * @access  Public
 */
exports.getCompletionsByRange = async (req, res) => {
  try {
    const { startDate, endDate, habitId } = req.query;
    
    const query = {};
    
    // Filter by habit if provided
    if (habitId) {
      query.habit = habitId;
    }
    
    // Filter by date range if provided
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const completions = await Completion.find(query)
      .sort({ date: -1 })
      .populate('habit', 'name color');

    res.status(200).json(completions);
  } catch (err) {
    console.error('Error in getCompletionsByRange:', err.message);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch completions', 
      error: err.message 
    });
  }
};

