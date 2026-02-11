const Habit = require('../models/Habit.js');
const Completion = require('../models/Completion.js');
const habitLogic = require('../services/habitLogic.js');

// Helper function to get heatmap color based on completion rate
function getHeatmapColor(rate) {
  if (rate === 0) return '#ebedf0'; // Light gray
  if (rate < 25) return '#c6e48b'; // Light green
  if (rate < 50) return '#7bc96f'; // Medium green
  if (rate < 75) return '#239a3b'; // Dark green
  return '#196127'; // Darkest green
}

// Helper function to get completion rate for a date
async function getCompletionRateForDate(date, userId) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Get all active habits for the USER that were due on this date
  const allHabits = await Habit.find({ 
    user: userId, // <--- Filter by user
    isActive: true 
  });
  
  const dueHabits = allHabits.filter(habit =>
    habitLogic.isHabitActiveOnDate(habit, date) &&
    habitLogic.isHabitDueOnDate(habit, date)
  );

  // Optimization: Only fetch completions for the relevant habits
  const dueHabitIds = dueHabits.map(h => h._id);

  // Get completions for this date
  const completions = await Completion.find({
    habit: { $in: dueHabitIds }, // <--- Filter by user's habits
    date: { $gte: startOfDay, $lte: endOfDay },
  });

  const totalCount = dueHabits.length;
  const completedCount = completions.length;
  const rate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return { total: totalCount, completed: completedCount, rate };
}

/**
 * @desc    Get all habits from the database
 * @route   GET /api/habits
 * @access  Private
 */
exports.getAllHabits = async (req, res) => {
  try {
    // Only get active habits for the logged-in user
    const habits = await Habit.find({ 
      user: req.user.id, // <--- Filter by user
      isActive: true,
      deletedAt: null 
    }).sort({ createdAt: -1 });
    
    res.status(200).json(habits);
  } catch (err) {
    console.error('Error in getAllHabits:', err.message);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch habits', 
      error: err.message 
    });
  }
};

/**
 * @desc    Get habits that are due today
 * @route   GET /api/habits/due-today
 * @access  Private
 */
exports.getTodaysDueHabits = async (req, res) => {
  try {
    // Use the static method on the Model (updated in previous step) which supports userId
    const dueHabits = await Habit.getTodaysHabits(req.user.id);
    
    // Get today's completions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get IDs of due habits to filter completions
    const habitIds = dueHabits.map(h => h._id);

    const completions = await Completion.find({
      habit: { $in: habitIds }, // <--- Filter by relevant habits
      date: {
        $gte: today,
        $lt: tomorrow,
      },
    });

    // Mark which habits are completed
    const habitsWithStatus = dueHabits.map(habit => {
      const habitObj = habit.toObject();
      const completion = completions.find(c => 
        c.habit.toString() === habit._id.toString()
      );
      
      return {
        ...habitObj,
        completedToday: !!completion,
        completionId: completion ? completion._id : null,
        todayValue: completion ? completion.value : 0,
      };
    });

    res.status(200).json(habitsWithStatus);
  } catch (err) {
    console.error('Error in getTodaysDueHabits:', err.message);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch today\'s due habits', 
      error: err.message 
    });
  }
};

/**
 * @desc    Create a new habit
 * @route   POST /api/habits
 * @access  Private
 */
exports.createHabit = async (req, res) => {
  // Get the data from the request body
  const { name, color, frequency, goal, startDate, endDate } = req.body;

  try {
    // Log incoming data for debugging
    console.log('Creating habit with data:', { name, color, frequency, goal });

    // Basic validation
    if (!name || !color) {
      return res.status(400).json({ 
        success: false,
        message: 'Name and color are required' 
      });
    }

    // Validate frequency structure if provided
    if (frequency && frequency.type === 'specific') {
      if (!Array.isArray(frequency.days) || frequency.days.length === 0) {
        return res.status(400).json({ 
          success: false,
          message: 'Please select at least one day for specific frequency' 
        });
      }
      // Validate day numbers are in range
      const invalidDays = frequency.days.filter(day => day < 0 || day > 6);
      if (invalidDays.length > 0) {
        return res.status(400).json({ 
          success: false,
          message: `Invalid day numbers: ${invalidDays.join(', ')}. Days must be between 0 (Monday) and 6 (Sunday)` 
        });
      }
    }

    // Create a new Habit document
    const newHabit = new Habit({
      user: req.user.id, // <--- Assign Owner
      name: name.trim(),
      color,
      frequency: frequency || { type: 'daily' },
      goal: goal || { type: 'yes_no' },
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    });

    // Save the new habit to the database
    const habit = await newHabit.save();
    console.log('Habit created successfully:', habit._id);
    res.status(201).json(habit); // Send the new habit back as a response
  } catch (err) {
    console.error('Error in createHabit:', err);
    console.error('Error details:', {
      name: err.name,
      message: err.message,
      stack: err.stack
    });
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message).join(', ');
      return res.status(400).json({ 
        success: false,
        message: `Validation error: ${errors}`,
        error: err.message 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Failed to create habit', 
      error: err.message 
    });
  }
};

/**
 * @desc    Get a single habit by its ID
 * @route   GET /api/habits/:id
 * @access  Private
 */
exports.getHabitById = async (req, res) => {
  try {
    // Find by ID and ensure it belongs to the user
    const habit = await Habit.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });

    if (!habit) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    res.json(habit);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Habit not found' });
    }
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

/**
 * @desc    Update an existing habit
 * @route   PUT /api/habits/:id
 * @access  Private
 */
exports.updateHabit = async (req, res) => {
  const { name, color, frequency, goal, startDate, endDate } = req.body;

  try {
    // Find by ID and ensure it belongs to the user
    let habit = await Habit.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });

    if (!habit) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    // Update the fields
    if (name !== undefined) habit.name = name;
    if (color !== undefined) habit.color = color;
    if (frequency !== undefined) habit.frequency = frequency;
    if (goal !== undefined) habit.goal = goal;
    if (startDate !== undefined) habit.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) habit.endDate = endDate ? new Date(endDate) : null;

    await habit.save();
    res.json(habit);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Failed to update habit', error: err.message });
  }
};

/**
 * @desc    Archive a habit (set isActive to false - preserves data, can restore)
 * @route   POST /api/habits/:id/archive
 * @access  Private
 */
exports.archiveHabit = async (req, res) => {
  try {
    const habit = await Habit.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });

    if (!habit) {
      return res.status(404).json({ 
        success: false,
        message: 'Habit not found' 
      });
    }

    // Archive: set isActive to false (can be restored)
    habit.isActive = false;
    habit.deletedAt = null; // Ensure deletedAt is null for archived habits
    await habit.save();

    res.status(200).json({ 
      success: true,
      message: 'Habit archived successfully',
      canRestore: true 
    });
  } catch (err) {
    console.error('Error in archiveHabit:', err.message);
    res.status(500).json({ 
      success: false,
      message: 'Failed to archive habit', 
      error: err.message 
    });
  }
};

/**
 * @desc    Delete a habit (soft delete - set deletedAt, kept for 1 month)
 * @route   DELETE /api/habits/:id
 * @access  Private
 */
exports.deleteHabit = async (req, res) => {
  try {
    const habit = await Habit.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });

    if (!habit) {
      return res.status(404).json({ 
        success: false,
        message: 'Habit not found' 
      });
    }

    // Soft delete: set deletedAt timestamp (will be permanently deleted after 1 month)
    habit.deletedAt = new Date();
    await habit.save();

    res.status(200).json({ 
      success: true,
      message: 'Habit deleted successfully. It will be permanently removed after 1 month.',
      canRestore: false // Deleted habits cannot be restored directly
    });
  } catch (err) {
    console.error('Error in deleteHabit:', err.message);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete habit', 
      error: err.message 
    });
  }
};

/**
 * @desc    Restore an archived habit
 * @route   POST /api/habits/:id/restore
 * @access  Private
 */
exports.restoreHabit = async (req, res) => {
  try {
    const habit = await Habit.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });

    if (!habit) {
      return res.status(404).json({ 
        success: false,
        message: 'Habit not found' 
      });
    }

    // Restore: set isActive to true
    habit.isActive = true;
    await habit.save();

    res.status(200).json({ 
      success: true,
      message: 'Habit restored successfully', 
      habit 
    });
  } catch (err) {
    console.error('Error in restoreHabit:', err.message);
    res.status(500).json({ 
      success: false,
      message: 'Failed to restore habit', 
      error: err.message 
    });
  }
};

/**
 * @desc    Get all archived habits (excludes deleted habits)
 * @route   GET /api/habits/archived
 * @access  Private
 */
exports.getArchivedHabits = async (req, res) => {
  try {
    // Only get archived habits for user that are not deleted
    const archived = await Habit.find({ 
      user: req.user.id,
      isActive: false,
      deletedAt: null 
    }).sort({ updatedAt: -1 });
    
    res.status(200).json(archived);
  } catch (err) {
    console.error('Error in getArchivedHabits:', err.message);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch archived habits', 
      error: err.message 
    });
  }
};

/**
 * @desc    Permanently delete habits that were deleted more than 1 month ago
 * @route   POST /api/habits/cleanup
 * @access  Private
 */
exports.cleanupDeletedHabits = async (req, res) => {
  try {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    // Find habits that were deleted more than 1 month ago belonging to the user
    const result = await Habit.deleteMany({
      user: req.user.id,
      deletedAt: { $lt: oneMonthAgo }
    });
    
    res.status(200).json({
      success: true,
      message: `Permanently deleted ${result.deletedCount} habit(s)`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error('Error in cleanupDeletedHabits:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup deleted habits',
      error: err.message
    });
  }
};

/**
 * @desc    Get all habits and completions for a specific date
 * @route   GET /api/habits/calendar/date/:date
 * @access  Private
 * @param   {string} date - Date in YYYY-MM-DD format
 */
exports.getHabitsForDate = async (req, res) => {
  try {
    const { date } = req.params;
    
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD',
      });
    }

    const targetDate = new Date(date + 'T00:00:00.000Z');
    
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date',
      });
    }

    // Get all habits that were active on that date for this user
    const allHabits = await Habit.find({ 
      user: req.user.id,
      isActive: true 
    });

    const activeHabits = allHabits.filter(habit =>
      habitLogic.isHabitActiveOnDate(habit, targetDate) &&
      habitLogic.isHabitDueOnDate(habit, targetDate)
    );

    // Get completions for that date
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const activeHabitIds = activeHabits.map(h => h._id);

    const completions = await Completion.find({
      habit: { $in: activeHabitIds }, // Filter by relevant habits
      date: { $gte: startOfDay, $lte: endOfDay },
    }).populate('habit');

    // Merge data
    const habitsWithStatus = activeHabits.map(habit => {
      const completion = completions.find(c =>
        (c.habit?._id || c.habit)?.toString() === habit._id.toString()
      );

      return {
        ...habit.toObject(),
        completed: !!completion,
        completionValue: completion?.value || 0,
        completionNotes: completion?.notes || null,
        completionId: completion?._id || null,
      };
    });

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const checkDate = new Date(targetDate);
    checkDate.setHours(0, 0, 0, 0);

    res.status(200).json({
      date: date,
      isPast: checkDate < now,
      isToday: checkDate.getTime() === now.getTime(),
      isFuture: checkDate > now,
      habitsCount: habitsWithStatus.length,
      completedCount: habitsWithStatus.filter(h => h.completed).length,
      completionRate: habitsWithStatus.length > 0
        ? Math.round((habitsWithStatus.filter(h => h.completed).length / habitsWithStatus.length) * 100)
        : 0,
      habits: habitsWithStatus,
    });
  } catch (err) {
    console.error('Error in getHabitsForDate:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch habits for date',
      error: err.message,
    });
  }
};

/**
 * @desc    Get calendar heatmap data for a month
 * @route   GET /api/habits/calendar/month/:year/:month
 * @access  Private
 * @param   {string} year - Year (e.g., 2024)
 * @param   {string} month - Month (1-12)
 */
exports.getMonthHeatmap = async (req, res) => {
  try {
    const { year, month } = req.params;
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year or month',
      });
    }

    // Get all days in the month
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    const heatmapData = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(yearNum, monthNum - 1, day);
      const dateStr = date.toISOString().split('T')[0];

      // Get completion rate for this day (Passing User ID)
      const dayData = await getCompletionRateForDate(date, req.user.id);

      heatmapData.push({
        date: dateStr,
        completionRate: dayData.rate,
        completedCount: dayData.completed,
        totalCount: dayData.total,
        color: getHeatmapColor(dayData.rate),
      });
    }

    res.status(200).json({
      success: true,
      year: yearNum,
      month: monthNum,
      data: heatmapData,
    });
  } catch (err) {
    console.error('Error in getMonthHeatmap:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch month heatmap',
      error: err.message,
    });
  }
};

/**
 * @desc    Log a new completion for a habit
 * @route   POST /api/habits/:id/complete
 * @access  Private
 */
exports.logCompletion = async (req, res) => {
  try {
    // Check ownership
    const habit = await Habit.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });

    if (!habit) {
      return res.status(404).json({ 
        success: false,
        message: 'Habit not found' 
      });
    }

    // Get today's date at midnight for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already completed today
    const existingCompletion = await Completion.findOne({
      habit: req.params.id,
      date: { $gte: today },
    });

    if (existingCompletion) {
      // Update existing completion value
      existingCompletion.value = req.body.value || 1;
      await existingCompletion.save();
      return res.status(200).json(existingCompletion);
    }

    // Create new completion
    const newCompletion = new Completion({
      habit: req.params.id,
      value: req.body.value || 1,
    });

    const completion = await newCompletion.save();
    res.status(201).json(completion);
  } catch (err) {
    console.error('Error in logCompletion:', err.message);
    res.status(500).json({ 
      success: false,
      message: 'Failed to log completion', 
      error: err.message 
    });
  }
};

/**
 * @desc    Get all completions for a specific habit
 * @route   GET /api/habits/:id/completions
 * @access  Private
 */
exports.getHabitCompletions = async (req, res) => {
  try {
    // Check ownership
    const habit = await Habit.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });

    if (!habit) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    // Find all completions for this habit, sorted by date
    const completions = await Completion.find({ habit: req.params.id }).sort({
      date: -1,
    });

    res.json(completions);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Failed to fetch completions', error: err.message });
  }
};

/**
 * @desc    Get all statistics for a single habit
 * @route   GET /api/habits/:id/stats
 * @access  Private
 */
exports.getHabitStats = async (req, res) => {
  try {
    // Check ownership
    const habit = await Habit.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });

    if (!habit) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    // Find all completions for a specific habit
    const completions = await Completion.find({ habit: req.params.id }).sort({
      date: 1,
    });

    // Calculate streaks
    const { currentStreak, longestStreak } = calculateStreaks(completions);

    // Prepare heatmap data (last 365 days)
    const heatmapData = prepareHeatmapData(completions);

    // Prepare chart data (monthly aggregation)
    const chartData = prepareChartData(completions);

    res.json({
      currentStreak,
      longestStreak,
      totalCompletions: completions.length,
      heatmapData,
      chartData,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Failed to fetch statistics', error: err.message });
  }
};

/**
 * @desc    Get summary of all habits with completion status
 * @route   GET /api/habits/summary
 * @access  Private
 */
exports.getHabitsSummary = async (req, res) => {
  try {
    const habits = await Habit.find({ 
      user: req.user.id 
    }).sort({ createdAt: -1 });

    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const habitIds = habits.map(h => h._id);

    // Get all completions for today for these habits
    const todayCompletions = await Completion.find({
      habit: { $in: habitIds },
      date: { $gte: today },
    });

    // Create a map of habit ID to completion status
    const completionMap = {};
    todayCompletions.forEach((completion) => {
      completionMap[completion.habit.toString()] = {
        completed: true,
        value: completion.value,
        completionId: completion._id,
      };
    });

    // Enhance habits with completion status
    const habitsWithStatus = habits.map((habit) => {
      const habitObj = habit.toObject();
      const completion = completionMap[habit._id.toString()];
      
      return {
        ...habitObj,
        completedToday: completion ? completion.completed : false,
        todayValue: completion ? completion.value : 0,
        completionId: completion ? completion.completionId : null,
      };
    });

    res.json({
      habits: habitsWithStatus,
      totalHabits: habits.length,
      completedToday: Object.keys(completionMap).length,
      completionRate: habits.length > 0 
        ? Math.round((Object.keys(completionMap).length / habits.length) * 100) 
        : 0,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Failed to fetch summary', error: err.message });
  }
};

// ==========================================
// HELPER FUNCTIONS (No Changes Required)
// ==========================================

/**
 * Calculate current and longest streaks from completions
 */
function calculateStreaks(completions) {
  if (completions.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Sort completions by date descending
  const sortedCompletions = [...completions].sort((a, b) => b.date - a.date);

  // Check current streak
  let checkDate = new Date(today);
  let streakBroken = false;

  for (let i = 0; i < sortedCompletions.length; i++) {
    const completionDate = new Date(sortedCompletions[i].date);
    completionDate.setHours(0, 0, 0, 0);

    if (completionDate.getTime() === checkDate.getTime()) {
      if (!streakBroken) currentStreak++;
      tempStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // Gap in streak
      const daysDiff = Math.floor((checkDate - completionDate) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 0) {
        if (!streakBroken) currentStreak++;
        tempStreak++;
      } else {
        streakBroken = true;
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
        tempStreak = 1;
      }
      checkDate = new Date(completionDate);
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  if (tempStreak > longestStreak) {
    longestStreak = tempStreak;
  }

  return { currentStreak, longestStreak };
}

/**
 * Prepare heatmap data for the last 365 days
 */
function prepareHeatmapData(completions) {
  const heatmapData = [];
  const completionMap = {};

  // Create a map of date strings to completion counts
  completions.forEach((completion) => {
    const dateStr = completion.date.toISOString().split('T')[0];
    completionMap[dateStr] = (completionMap[dateStr] || 0) + completion.value;
  });

  // Generate data for last 365 days
  const today = new Date();
  for (let i = 364; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    heatmapData.push({
      date: dateStr,
      count: completionMap[dateStr] || 0,
    });
  }

  return heatmapData;
}

/**
 * Prepare chart data with monthly aggregation
 */
function prepareChartData(completions) {
  const monthlyData = {};

  completions.forEach((completion) => {
    const date = new Date(completion.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = 0;
    }
    monthlyData[monthKey] += completion.value;
  });

  // Convert to array format for charts
  const chartData = Object.keys(monthlyData)
    .sort()
    .slice(-12) // Last 12 months
    .map((key) => {
      const [year, month] = key.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      return {
        name: `${monthNames[parseInt(month) - 1]} ${year}`,
        value: monthlyData[key],
      };
    });

  return chartData;
}