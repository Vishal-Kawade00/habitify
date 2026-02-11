const DietPlan = require('../models/DietPlan');

// Activity level multipliers for TDEE calculation
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

// Nutrition database (simplified - in production, use a real API or database)
const NUTRITION_DB = {
  chicken: { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  rice: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  broccoli: { calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
  salmon: { calories: 206, protein: 22, carbs: 0, fat: 12 },
  eggs: { calories: 155, protein: 13, carbs: 1.1, fat: 11 },
  oatmeal: { calories: 389, protein: 17, carbs: 66, fat: 7 },
  banana: { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 },
  'greek yogurt': { calories: 59, protein: 10, carbs: 3.6, fat: 0.4 },
  'sweet potato': { calories: 86, protein: 1.6, carbs: 20, fat: 0.1 },
  quinoa: { calories: 222, protein: 8, carbs: 39, fat: 3.6 },
};

/**
 * Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor Equation
 */
function calculateBMR(weight, height, age, gender) {
  // Weight in kg, height in cm, age in years
  if (gender.toLowerCase() === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
}

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 */
function calculateTDEE(bmr, activity) {
  const multiplier = ACTIVITY_MULTIPLIERS[activity] || 1.2;
  return Math.round(bmr * multiplier);
}

/**
 * Adjust calories based on goal
 */
function adjustCaloriesForGoal(tdee, goal) {
  switch (goal) {
    case 'lose_weight':
      return Math.round(tdee * 0.85); // 15% deficit
    case 'gain_weight':
    case 'gain_muscle': // Handle inconsistent naming
    case 'build_muscle':
      return Math.round(tdee * 1.15); // 15% surplus
    case 'maintain':
    case 'maintain_weight':
    default:
      return tdee;
  }
}

/**
 * Calculate macronutrient distribution
 */
function calculateMacros(calories, goal) {
  let proteinRatio, carbRatio, fatRatio;

  if (goal === 'build_muscle' || goal === 'gain_weight' || goal === 'gain_muscle') {
    proteinRatio = 0.3;
    carbRatio = 0.45;
    fatRatio = 0.25;
  } else if (goal === 'lose_weight') {
    proteinRatio = 0.35;
    carbRatio = 0.35;
    fatRatio = 0.30;
  } else {
    proteinRatio = 0.25;
    carbRatio = 0.50;
    fatRatio = 0.25;
  }

  return {
    protein: Math.round((calories * proteinRatio) / 4), // 4 cal per gram
    carbs: Math.round((calories * carbRatio) / 4),
    fat: Math.round((calories * fatRatio) / 9), // 9 cal per gram
  };
}

/**
 * Generate meal suggestions
 */
function generateMealSuggestions(mealType, calorieTarget, dietaryRestrictions = []) {
  const meals = {
    breakfast: [
      { name: 'Oatmeal with banana and Greek yogurt', calories: 450 },
      { name: 'Scrambled eggs with whole grain toast', calories: 320 },
      { name: 'Protein smoothie with fruits', calories: 380 },
    ],
    lunch: [
      { name: 'Grilled chicken with quinoa and vegetables', calories: 420 },
      { name: 'Salmon salad with olive oil dressing', calories: 380 },
      { name: 'Quinoa bowl with vegetables and chickpeas', calories: 400 },
    ],
    dinner: [
      { name: 'Baked salmon with sweet potato and broccoli', calories: 520 },
      { name: 'Grilled chicken breast with rice and vegetables', calories: 480 },
      { name: 'Turkey stir-fry with vegetables', calories: 450 },
    ],
    snack: [
      { name: 'Greek yogurt with berries', calories: 150 },
      { name: 'Apple with almond butter', calories: 200 },
      { name: 'Protein bar', calories: 180 },
    ],
  };

  let suggestions = meals[mealType] || meals.snack;

  // Filter based on dietary restrictions
  if (dietaryRestrictions.includes('vegetarian')) {
    suggestions = suggestions.filter((meal) => 
      !meal.name.toLowerCase().includes('chicken') &&
      !meal.name.toLowerCase().includes('salmon') &&
      !meal.name.toLowerCase().includes('turkey') &&
      !meal.name.toLowerCase().includes('eggs')
    );
  }

  if (dietaryRestrictions.includes('vegan')) {
    suggestions = suggestions.filter((meal) =>
      !meal.name.toLowerCase().includes('yogurt') &&
      !meal.name.toLowerCase().includes('eggs') &&
      !meal.name.toLowerCase().includes('chicken') &&
      !meal.name.toLowerCase().includes('salmon') &&
      !meal.name.toLowerCase().includes('turkey')
    );
  }

  return suggestions.slice(0, 3);
}

/**
 * @desc    Generate a personalized diet and exercise plan (Fallback/Node Logic)
 * @route   POST /api/diet/generate
 * @access  Public
 */
exports.generatePlan = async (req, res) => {
  try {
    const { goal, weight, activity, age, height, gender, dietaryPreferences = [] } = req.body;

    // Validation
    if (!goal || !weight || !activity) {
      return res.status(400).json({ 
        message: 'Missing required fields: goal, weight, and activity are required' 
      });
    }

    // Calculate BMR and TDEE
    let bmr = 2000; // Default if age/height/gender not provided
    if (age && height && gender) {
      bmr = calculateBMR(weight, height, age, gender);
    }

    const tdee = calculateTDEE(bmr, activity);
    const targetCalories = adjustCaloriesForGoal(tdee, goal);
    const macros = calculateMacros(targetCalories, goal);

    // Generate sample diet plan
    const breakfast = generateMealSuggestions('breakfast', Math.round(targetCalories * 0.25), dietaryPreferences)[0] || { name: "Generic Healthy Breakfast", calories: 400 };
    const lunch = generateMealSuggestions('lunch', Math.round(targetCalories * 0.35), dietaryPreferences)[0] || { name: "Generic Healthy Lunch", calories: 600 };
    const dinner = generateMealSuggestions('dinner', Math.round(targetCalories * 0.30), dietaryPreferences)[0] || { name: "Generic Healthy Dinner", calories: 500 };
    const snack = generateMealSuggestions('snack', Math.round(targetCalories * 0.10), dietaryPreferences)[0] || { name: "Generic Healthy Snack", calories: 200 };

    const diet = [
      { meal: 'Breakfast', food: breakfast.name, calories: breakfast.calories, protein: Math.round(macros.protein * 0.25), carbs: Math.round(macros.carbs * 0.25), fat: Math.round(macros.fat * 0.25) },
      { meal: 'Lunch', food: lunch.name, calories: lunch.calories, protein: Math.round(macros.protein * 0.35), carbs: Math.round(macros.carbs * 0.35), fat: Math.round(macros.fat * 0.35) },
      { meal: 'Dinner', food: dinner.name, calories: dinner.calories, protein: Math.round(macros.protein * 0.30), carbs: Math.round(macros.carbs * 0.30), fat: Math.round(macros.fat * 0.30) },
      { meal: 'Snack', food: snack.name, calories: snack.calories, protein: Math.round(macros.protein * 0.10), carbs: Math.round(macros.carbs * 0.10), fat: Math.round(macros.fat * 0.10) },
    ];

    // Generate exercise plan
    const exercise = [
      { day: 'Monday', workout: 'Cardio & Upper Body', duration: '45 min', videoUrl: '#' },
      { day: 'Tuesday', workout: 'Lower Body Strength', duration: '40 min', videoUrl: '#' },
      { day: 'Wednesday', workout: 'Rest Day', duration: '0 min', videoUrl: '#' },
      { day: 'Thursday', workout: 'Full Body HIIT', duration: '30 min', videoUrl: '#' },
      { day: 'Friday', workout: 'Upper Body Strength', duration: '45 min', videoUrl: '#' },
      { day: 'Saturday', workout: 'Lower Body & Cardio', duration: '50 min', videoUrl: '#' },
      { day: 'Sunday', workout: 'Rest Day', duration: '0 min', videoUrl: '#' },
    ];

    const plan = {
      diet,
      exercise,
      totalCalories: targetCalories,
      macros,
      bmr,
      tdee,
      summary: {
        goal,
        recommendedCalories: targetCalories,
        protein: `${macros.protein}g`,
        carbs: `${macros.carbs}g`,
        fat: `${macros.fat}g`,
      },
    };

    res.json(plan);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Failed to generate diet plan', error: err.message });
  }
};

/**
 * @desc    Get all saved diet plans
 * @route   GET /api/diet/plans
 * @access  Private (Needs Auth Middleware)
 */
exports.getSavedPlans = async (req, res) => {
  try {
    // Check if user is authenticated (req.user should be populated by auth middleware)
    if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'Unauthorized. User ID not found.' });
    }

    const plans = await DietPlan.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ plans });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Failed to fetch saved plans', error: err.message });
  }
};

/**
 * @desc    Save a diet plan to the database
 * @route   POST /api/diet/save
 * @access  Private (Needs Auth Middleware)
 */
exports.savePlan = async (req, res) => {
  try {
    const { plan, name } = req.body;

    // Validation
    if (!plan) {
      return res.status(400).json({ message: 'Plan data is required' });
    }
    
    // Check authentication
    if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'Unauthorized. Please log in to save plans.' });
    }

    // Construct metadata from the plan object if available
    const meta = plan.meta || {
        tdee: plan.tdee || 0,
        goal_calories: plan.goal_calories || plan.totalCalories || 0
    };

    const newPlan = new DietPlan({
      user: req.user.id,
      name: name || `Plan ${new Date().toLocaleDateString()}`,
      meta: meta,
      diet: plan.diet || [],
      exercise: plan.exercise || [] // Ensure it matches schema
    });

    const savedPlan = await newPlan.save();
    res.status(201).json(savedPlan);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Failed to save plan', error: err.message });
  }
};

/**
 * @desc    Calculate daily calorie needs and macronutrient distribution
 * @route   POST /api/diet/calculate-calories
 * @access  Public
 */
exports.calculateCalories = async (req, res) => {
  try {
    const { weight, height, age, gender, activity, goal } = req.body;

    if (!weight || !height || !age || !gender || !activity) {
      return res.status(400).json({ 
        message: 'Missing required fields: weight, height, age, gender, and activity are required' 
      });
    }

    const bmr = calculateBMR(weight, height, age, gender);
    const tdee = calculateTDEE(bmr, activity);
    const targetCalories = adjustCaloriesForGoal(tdee, goal);
    const macros = calculateMacros(targetCalories, goal);

    res.json({
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      targetCalories: Math.round(targetCalories),
      macros,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Failed to calculate calories', error: err.message });
  }
};

/**
 * @desc    Get nutrition information for a specific food item
 * @route   GET /api/diet/nutrition/:food
 * @access  Public
 */
exports.getNutritionInfo = async (req, res) => {
  try {
    const foodName = decodeURIComponent(req.params.food).toLowerCase();
    
    const nutrition = NUTRITION_DB[foodName];
    
    if (!nutrition) {
      return res.status(404).json({ 
        message: `Nutrition information not found for "${req.params.food}"`,
        suggestion: 'Try: chicken, rice, broccoli, salmon, eggs, oatmeal, banana, greek yogurt, sweet potato, quinoa'
      });
    }

    res.json({
      food: req.params.food,
      ...nutrition,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Failed to fetch nutrition info', error: err.message });
  }
};

/**
 * @desc    Get meal suggestions based on preferences
 * @route   POST /api/diet/meal-suggestions
 * @access  Public
 */
exports.getMealSuggestions = async (req, res) => {
  try {
    const { mealType, calorieTarget = 400, dietaryRestrictions = [] } = req.body;

    if (!mealType) {
      return res.status(400).json({ message: 'mealType is required' });
    }

    const suggestions = generateMealSuggestions(mealType, calorieTarget, dietaryRestrictions);

    res.json({
      mealType,
      calorieTarget,
      suggestions,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Failed to fetch meal suggestions', error: err.message });
  }
};