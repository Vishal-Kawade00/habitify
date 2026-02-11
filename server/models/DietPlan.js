const mongoose = require('mongoose');

const DietPlanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  name: {
    type: String,
    default: 'My Diet Plan'
  },
  meta: {
    tdee: Number,
    goal_calories: Number
  },
  diet: [
    {
      meal: String,
      food: String,
      calories: Number,
      protein: Number,
      carbs: Number,
      fat: Number
    }
  ],
  exercise: [
    {
      day: String,
      workout: String,
      duration: String,
      videoUrl: String
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('dietPlan', DietPlanSchema);