const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Defines the structure for a Habit Completion.
 * This logs every time a habit is completed on a specific day.
 */
const CompletionSchema = new Schema(
  {
    /**
     * Links this completion record to its parent habit.
     * 'ref: 'Habit'' tells Mongoose to link this to the 'Habit' model.
     */
    habit: {
      type: Schema.Types.ObjectId,
      ref: 'Habit',
      required: [true, 'Habit reference is required'],
      index: true, // Index for faster queries
    },
    /**
     * The date the habit was completed.
     * We store only the date portion (no time) for consistency.
     */
    date: {
      type: Date,
      required: true,
      default: function () {
        // Set to midnight of current day for consistency
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return now;
      },
    },
    /**
     * Stores how much was completed, for 'target' goals.
     * e.g., 8 (for "8 glasses of water")
     */
    value: {
      type: Number,
      default: 1,
      min: [0, 'Value cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Value must be a whole number',
      },
    },
    /**
     * Optional: Add notes for the completion
     */
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    /**
     * Optional: Track completion source (manual, reminder, auto)
     */
    source: {
      type: String,
      enum: ['manual', 'reminder', 'auto', 'import'],
      default: 'manual',
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// ==========================================
// INDEXES FOR PERFORMANCE & UNIQUENESS
// ==========================================

// Compound index: Ensures one completion per habit per day
// This prevents duplicate completions for the same habit on the same day
CompletionSchema.index({ habit: 1, date: 1 }, { unique: true });

// Index for date range queries (used in statistics and heatmaps)
CompletionSchema.index({ date: -1 });

// Compound index for efficient queries by habit and date range
CompletionSchema.index({ habit: 1, date: -1 });

// ==========================================
// VIRTUAL PROPERTIES
// ==========================================

// Virtual to check if completion is from today
CompletionSchema.virtual('isToday').get(function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const completionDate = new Date(this.date);
  completionDate.setHours(0, 0, 0, 0);
  return completionDate.getTime() === today.getTime();
});

// Virtual to get how many days ago this completion was made
CompletionSchema.virtual('daysAgo').get(function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const completionDate = new Date(this.date);
  completionDate.setHours(0, 0, 0, 0);
  const diffTime = today - completionDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// ==========================================
// INSTANCE METHODS
// ==========================================

/**
 * Format the completion date as YYYY-MM-DD
 * @returns {string}
 */
CompletionSchema.methods.getFormattedDate = function () {
  const date = new Date(this.date);
  return date.toISOString().split('T')[0];
};

/**
 * Check if this completion meets the habit's goal
 * @param {object} habit - The habit object
 * @returns {boolean}
 */
CompletionSchema.methods.meetsGoal = function (habit) {
  if (habit.goal.type === 'yes_no') {
    return this.value >= 1;
  }
  return this.value >= habit.goal.target;
};

// ==========================================
// STATIC METHODS
// ==========================================

/**
 * Get all completions for a specific habit
 * @param {string} habitId - The habit ID
 * @param {object} options - Query options (startDate, endDate, limit)
 * @returns {Promise<Array>}
 */
CompletionSchema.statics.getHabitCompletions = async function (habitId, options = {}) {
  const query = { habit: habitId };
  
  // Add date range filter if provided
  if (options.startDate || options.endDate) {
    query.date = {};
    if (options.startDate) query.date.$gte = options.startDate;
    if (options.endDate) query.date.$lte = options.endDate;
  }
  
  return this.find(query)
    .sort({ date: -1 })
    .limit(options.limit || 0);
};

/**
 * Get today's completions across all habits
 * @returns {Promise<Array>}
 */
CompletionSchema.statics.getTodaysCompletions = async function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return this.find({
    date: {
      $gte: today,
      $lt: tomorrow,
    },
  }).populate('habit');
};

/**
 * Get completions for a specific date
 * @param {Date} date - The target date
 * @returns {Promise<Array>}
 */
CompletionSchema.statics.getCompletionsByDate = async function (date) {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);
  
  return this.find({
    date: {
      $gte: targetDate,
      $lt: nextDay,
    },
  }).populate('habit');
};

/**
 * Get completions within a date range
 * @param {Date} startDate - Start of range
 * @param {Date} endDate - End of range
 * @returns {Promise<Array>}
 */
CompletionSchema.statics.getCompletionsByRange = async function (startDate, endDate) {
  return this.find({
    date: {
      $gte: startDate,
      $lte: endDate,
    },
  })
    .sort({ date: -1 })
    .populate('habit');
};

/**
 * Check if a habit was completed on a specific date
 * @param {string} habitId - The habit ID
 * @param {Date} date - The date to check
 * @returns {Promise<object|null>}
 */
CompletionSchema.statics.checkCompletion = async function (habitId, date) {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);
  
  return this.findOne({
    habit: habitId,
    date: {
      $gte: targetDate,
      $lt: nextDay,
    },
  });
};

/**
 * Calculate streak for a habit
 * @param {string} habitId - The habit ID
 * @returns {Promise<object>} { currentStreak, longestStreak }
 */
CompletionSchema.statics.calculateStreak = async function (habitId) {
  const completions = await this.find({ habit: habitId })
    .sort({ date: -1 })
    .lean();
  
  if (completions.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }
  
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let checkDate = new Date(today);
  let streakBroken = false;
  
  for (const completion of completions) {
    const completionDate = new Date(completion.date);
    completionDate.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((checkDate - completionDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) {
      if (!streakBroken) currentStreak++;
      tempStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (daysDiff === 1) {
      if (!streakBroken) currentStreak++;
      tempStreak++;
      checkDate = new Date(completionDate);
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      streakBroken = true;
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
      tempStreak = 1;
      checkDate = new Date(completionDate);
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }
  
  if (tempStreak > longestStreak) {
    longestStreak = tempStreak;
  }
  
  return { currentStreak, longestStreak };
};

// ==========================================
// MIDDLEWARE (HOOKS)
// ==========================================

// Pre-save hook: Normalize date to midnight
CompletionSchema.pre('save', function (next) {
  if (this.date) {
    const normalizedDate = new Date(this.date);
    normalizedDate.setHours(0, 0, 0, 0);
    this.date = normalizedDate;
  }
  next();
});

// Post-save hook: Log completion creation (optional)
CompletionSchema.post('save', function (doc) {
  console.log(`✓ Completion logged for habit ${doc.habit} on ${doc.getFormattedDate()}`);
});

// Handle duplicate key error gracefully
CompletionSchema.post('save', function (error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    next(new Error('Completion already exists for this habit on this date'));
  } else {
    next(error);
  }
});

// ==========================================
// TOOBJECT & TOJSON OPTIONS
// ==========================================

// Include virtuals when converting to JSON
CompletionSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    // Remove MongoDB internal fields
    delete ret.__v;
    // Format date as YYYY-MM-DD for frontend
    ret.dateFormatted = new Date(ret.date).toISOString().split('T')[0];
    return ret;
  },
});

CompletionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Completion', CompletionSchema);