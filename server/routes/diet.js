const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // <--- Import Middleware

// Import all diet controller functions
const {
  generatePlan,
  getSavedPlans,
  savePlan,
  getNutritionInfo,
  calculateCalories,
  getMealSuggestions,
} = require('../controllers/dietController.js');

// ==========================================
// DIET PLAN GENERATION & MANAGEMENT
// ==========================================

// @route   POST /api/diet/generate
// @desc    Generate a personalized diet and exercise plan
// @frontend generateDietPlan(userData)
// @body    { goal, weight, activity, age?, height?, gender?, dietaryPreferences? }
// @access  Private
router.post('/generate', auth, generatePlan);

// @route   GET /api/diet/plans
// @desc    Get all saved diet plans for the user
// @frontend getSavedDietPlans()
// @access  Private
router.get('/plans', auth, getSavedPlans);

// @route   POST /api/diet/save
// @desc    Save a diet plan to the database
// @frontend saveDietPlan(plan, name)
// @body    { plan, name }
// @access  Private
router.post('/save', auth, savePlan);

// ==========================================
// NUTRITION & CALORIE CALCULATIONS
// ==========================================

// @route   POST /api/diet/calculate-calories
// @desc    Calculate daily calorie needs and macronutrient distribution
// @frontend calculateCalories(userData)
// @body    { weight, height, age, gender, activity, goal }
// @access  Private
router.post('/calculate-calories', auth, calculateCalories);

// @route   GET /api/diet/nutrition/:food
// @desc    Get nutrition information for a specific food item
// @frontend getNutritionInfo(foodName)
// @param   food - Name of the food item (URL encoded)
// @access  Public
router.get('/nutrition/:food', getNutritionInfo);

// ==========================================
// MEAL SUGGESTIONS & RECOMMENDATIONS
// ==========================================

// @route   POST /api/diet/meal-suggestions
// @desc    Get meal suggestions based on preferences and calorie target
// @frontend getMealSuggestions(preferences)
// @body    { mealType, calorieTarget?, dietaryRestrictions? }
// @access  Private
router.post('/meal-suggestions', auth, getMealSuggestions);

module.exports = router;