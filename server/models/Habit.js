const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Defines the structure for a Habit.
 */
const HabitSchema = new Schema(
  {
    // 1. Associate habit with a user
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user', // Must match the model name exported in User.js
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Habit name is required.'],
      trim: true,
      maxlength: [100, 'Habit name cannot exceed 100 characters'],
    },
    color: {
      type: String,
      default: '#3B82F6', // Default to a nice blue
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color code'],
    },
    frequency: {
      type: {
        type: String,
        enum: ['daily', 'specific', 'specific_days'], // Accept both 'specific' and 'specific_days' for compatibility
        default: 'daily',
      },
      // e.g., [0, 2, 4] for Monday, Wednesday, Friday
      // Day mapping: 0 = Monday, 1 = Tuesday, 2 = Wednesday, 3 = Thursday, 4 = Friday, 5 = Saturday, 6 = Sunday
      days: [
        {
          type: Number, // 0 = Monday, 1 = Tuesday, ..., 6 = Sunday (matches frontend convention)
          min: [0, 'Day must be between 0 (Monday) and 6 (Sunday)'],
          max: [6, 'Day must be between 0 (Monday) and 6 (Sunday)'],
        },
      ],
    },
    goal: {
      type: {
        type: String,
        enum: ['yes_no', 'target'],
        default: 'yes_no',
      },
      target: {
        type: Number,
        default: 1, // e.g., "Drink 8 glasses of water"
        min: [1, 'Target must be at least 1'],
      },
      unit: {
        type: String,
        default: 'times', // e.g., "glasses", "pages", "minutes"
        trim: true,
        maxlength: [20, 'Unit cannot exceed 20 characters'],
      },
    },
    // Optional: Add description field for habit details
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    // Optional: Track if habit is active or archived
    isActive: {
      type: Boolean,
      default: true,
    },
    // Track when habit was deleted (for soft delete with 1 month retention)
    deletedAt: {
      type: Date,
      default: null, // If null, habit is not deleted
    },
    // Optional: Add icon/emoji field
    icon: {
      type: String,
      trim: true,
      maxlength: [10, 'Icon cannot exceed 10 characters'],
    },
    // Optional: Add reminder time
    reminderTime: {
      type: String, // Format: "HH:MM" (24-hour)
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please provide a valid time in HH:MM format'],
    },
    // Date range for when habit should be active
    startDate: {
      type: Date,
      default: null, // If null, habit starts immediately
    },
    endDate: {
      type: Date,
      default: null, // If null, habit has no end date
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // Automatically add 'createdAt' and 'updatedAt' timestamps
    timestamps: true,
  }
);

// ==========================================
// INDEXES FOR PERFORMANCE
// ==========================================

// 2. Index for faster queries on active habits PER USER
HabitSchema.index({ user: 1, isActive: 1, createdAt: -1 });

// Index for searching by name
HabitSchema.index({ name: 'text' });

// ==========================================
// VIRTUAL PROPERTIES
// ==========================================

// Virtual to get habit age in days
HabitSchema.virtual('ageInDays').get(function () {
  const now = new Date();
  const created = new Date(this.createdAt);
  const diffTime = Math.abs(now - created);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// ==========================================
// INSTANCE METHODS
// ==========================================

/**
 * Check if habit is scheduled for a specific day
 * @param {number} dayOfWeek - 0 (Sunday) to 6 (Saturday)
 * @returns {boolean}
 */
HabitSchema.methods.isScheduledForDay = function (dayOfWeek) {
  if (this.frequency.type === 'daily') {
    return true;
  }
  // Handle both 'specific' and 'specific_days' for backward compatibility
  if (this.frequency.type === 'specific' || this.frequency.type === 'specific_days') {
    return this.frequency.days && this.frequency.days.includes(dayOfWeek);
  }
  return false;
};

/**
 * Check if habit is scheduled for today
 * @returns {boolean}
 */
HabitSchema.methods.isScheduledForToday = function () {
  const today = new Date().getDay();
  return this.isScheduledForDay(today);
};

// ==========================================
// STATIC METHODS
// ==========================================

/**
 * Get all active habits scheduled for today for a specific user
 * @param {string} userId - The user ID to filter by
 * @returns {Promise<Array>}
 */
// 3. Update static method to accept userId
HabitSchema.statics.getTodaysHabits = async function (userId) {
  const today = new Date().getDay();
  
  return this.find({
    user: userId, // Filter by user
    isActive: true,
    $or: [
      { 'frequency.type': 'daily' },
      { 'frequency.type': 'specific', 'frequency.days': today },
      { 'frequency.type': 'specific_days', 'frequency.days': today }
    ]
  }).sort({ createdAt: -1 });
};

/**
 * Archive a habit (soft delete)
 * @param {string} habitId - The habit ID to archive
 * @returns {Promise<object>}
 */
HabitSchema.statics.archiveHabit = async function (habitId) {
  return this.findByIdAndUpdate(
    habitId,
    { isActive: false },
    { new: true }
  );
};

// ==========================================
// MIDDLEWARE (HOOKS)
// ==========================================

// Pre-save hook: Validate frequency days if type is 'specific' or 'specific_days'
// Also normalize 'specific' to ensure consistency
HabitSchema.pre('save', function (next) {
  // Only validate if frequency exists and type is 'specific' or 'specific_days'
  if (this.frequency) {
    // Normalize 'specific' and 'specific_days' to 'specific' for consistency
    if (this.frequency.type === 'specific' || this.frequency.type === 'specific_days') {
      this.frequency.type = 'specific';
      // Only validate days if it's a specific frequency type
      if (!Array.isArray(this.frequency.days) || this.frequency.days.length === 0) {
        return next(new Error('Please select at least one day for specific frequency'));
      }
      // Validate day numbers are in valid range
      const invalidDays = this.frequency.days.filter(day => typeof day !== 'number' || day < 0 || day > 6);
      if (invalidDays.length > 0) {
        return next(new Error('Invalid day numbers. Days must be between 0 (Monday) and 6 (Sunday)'));
      }
    }
    // For daily habits, ensure days array is empty or not set
    if (this.frequency.type === 'daily') {
      // Daily habits don't need days array, but if it exists, it should be empty
      if (this.frequency.days && Array.isArray(this.frequency.days) && this.frequency.days.length > 0) {
        this.frequency.days = [];
      }
    }
  }
  next();
});

// Pre-save hook: Remove duplicate days
HabitSchema.pre('save', function (next) {
  if (this.frequency.days && this.frequency.days.length > 0) {
    this.frequency.days = [...new Set(this.frequency.days)].sort();
  }
  next();
});

// ==========================================
// TOOBJECT & TOJSON OPTIONS
// ==========================================

// Include virtuals when converting to JSON
HabitSchema.set('toJSON', { 
  virtuals: true,
  transform: function (doc, ret) {
    // Remove MongoDB internal fields from JSON output
    delete ret.__v;
    return ret;
  }
});

HabitSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Habit', HabitSchema);