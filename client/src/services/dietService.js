import axios from 'axios';

// Base URL for diet-related API endpoints with fallback
const BASE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_URL = `${BASE_API_URL}/diet`;

// Configure axios defaults
axios.defaults.headers.common['Content-Type'] = 'application/json';

/**
 * Generates a personalized diet and exercise plan using AI/ML.
 * Corresponds to: POST /api/diet/generate
 * @param {object} planData - User data for plan generation
 * @param {string} planData.goal - User's goal ('lose_weight', 'maintain_weight', 'gain_muscle')
 * @param {number} planData.weight - Current weight in kg
 * @param {number} planData.height - Height in cm
 * @param {number} planData.age - Age in years
 * @param {string} planData.gender - Gender ('male', 'female', 'other')
 * @param {string} planData.activity - Activity level ('sedentary', 'light', 'moderate', 'very', 'extra')
 * @returns {Promise<object>} Generated plan object containing:
 *   - diet: array of meal objects { meal, food, calories, protein, carbs, fat }
 *   - exercise: array of workout objects { day, workout, duration, videoUrl }
 *   - totalCalories: number
 *   - macros: object with protein, carbs, fat breakdown
 */
export const generatePlan = async (planData) => {
  try {
    // Validate input data
    if (!planData.goal || !planData.weight || !planData.height || !planData.age) {
      throw new Error('Missing required fields: goal, weight, height, and age are required');
    }

    const res = await axios.post(`${API_URL}/generate`, planData);
    return res.data;
  } catch (err) {
    console.error('Error generating diet plan:', err);
    throw new Error(err.response?.data?.message || 'Failed to generate diet plan');
  }
};

/**
 * Saves a generated diet plan to the user's saved plans.
 * Corresponds to: POST /api/diet/save
 * @param {object} planData - The complete plan object to save
 * @returns {Promise<object>} Saved plan object with ID
 */
export const savePlan = async (planData) => {
  try {
    // Ensure we're sending the correct format: { plan, name }
    const payload = {
      plan: planData.plan || planData,
      name: planData.name || `Plan ${new Date().toLocaleDateString()}`
    };
    const res = await axios.post(`${API_URL}/save`, payload);
    return res.data;
  } catch (err) {
    console.error('Error saving diet plan:', err);
    throw new Error(err.response?.data?.message || 'Failed to save diet plan');
  }
};

/**
 * Fetches all saved diet plans for the user.
 * Corresponds to: GET /api/diet/plans
 * @returns {Promise<Array>} Array of saved plan objects
 */
export const getSavedPlans = async () => {
  try {
    const res = await axios.get(`${API_URL}/plans`);
    return res.data;
  } catch (err) {
    console.error('Error fetching saved plans:', err);
    throw new Error(err.response?.data?.message || 'Failed to fetch saved plans');
  }
};

/**
 * Fetches a specific saved plan by ID.
 * Corresponds to: GET /api/diet/plans/:id
 * @param {string} planId - The ID of the plan to fetch
 * @returns {Promise<object>} The saved plan object
 */
export const getSavedPlan = async (planId) => {
  try {
    const res = await axios.get(`${API_URL}/plans/${planId}`);
    return res.data;
  } catch (err) {
    console.error('Error fetching saved plan:', err);
    throw new Error(err.response?.data?.message || 'Failed to fetch plan');
  }
};

/**
 * Deletes a saved diet plan.
 * Corresponds to: DELETE /api/diet/plans/:id
 * @param {string} planId - The ID of the plan to delete
 * @returns {Promise<object>} Success message
 */
export const deletePlan = async (planId) => {
  try {
    const res = await axios.delete(`${API_URL}/plans/${planId}`);
    return res.data;
  } catch (err) {
    console.error('Error deleting plan:', err);
    throw new Error(err.response?.data?.message || 'Failed to delete plan');
  }
};

/**
 * Downloads a diet plan as a PDF file.
 * Corresponds to: POST /api/diet/download
 * @param {object} planData - The plan data to convert to PDF
 * @param {object} userData - User information to include in the PDF
 * @returns {Promise<Blob>} PDF file blob
 */
export const downloadPlanAsPDF = async (planData, userData) => {
  try {
    const res = await axios.post(
      `${API_URL}/download`,
      { plan: planData, user: userData },
      { responseType: 'blob' } // Important for file download
    );

    // Create a blob URL and trigger download
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `diet-plan-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return blob;
  } catch (err) {
    console.error('Error downloading PDF:', err);
    throw new Error(err.response?.data?.message || 'Failed to download PDF');
  }
};

/**
 * Converts plan items to trackable habits.
 * Corresponds to: POST /api/diet/to-habits
 * @param {object} planData - The plan data to convert
 * @param {Array<string>} selectedItems - Array of item IDs to convert to habits
 * @returns {Promise<Array>} Array of created habit objects
 */
export const convertPlanToHabits = async (planData, selectedItems) => {
  try {
    const res = await axios.post(`${API_URL}/to-habits`, {
      plan: planData,
      items: selectedItems,
    });
    return res.data;
  } catch (err) {
    console.error('Error converting plan to habits:', err);
    throw new Error(err.response?.data?.message || 'Failed to convert plan to habits');
  }
};

/**
 * Gets nutritional information for a specific food item.
 * Corresponds to: GET /api/diet/nutrition/:foodName
 * @param {string} foodName - Name of the food item
 * @returns {Promise<object>} Nutritional information
 */
export const getNutritionInfo = async (foodName) => {
  try {
    const res = await axios.get(`${API_URL}/nutrition/${encodeURIComponent(foodName)}`);
    return res.data;
  } catch (err) {
    console.error('Error fetching nutrition info:', err);
    throw new Error(err.response?.data?.message || 'Failed to fetch nutrition information');
  }
};

/**
 * Gets exercise video recommendations from YouTube.
 * Corresponds to: GET /api/diet/exercise-videos/:workoutName
 * @param {string} workoutName - Name of the workout
 * @returns {Promise<Array>} Array of video objects with URLs and metadata
 */
export const getExerciseVideos = async (workoutName) => {
  try {
    const res = await axios.get(`${API_URL}/exercise-videos/${encodeURIComponent(workoutName)}`);
    return res.data;
  } catch (err) {
    console.error('Error fetching exercise videos:', err);
    throw new Error(err.response?.data?.message || 'Failed to fetch exercise videos');
  }
};

/**
 * Calculates BMI and other health metrics.
 * Corresponds to: POST /api/diet/calculate-metrics
 * @param {object} userData - User data for calculations
 * @param {number} userData.weight - Weight in kg
 * @param {number} userData.height - Height in cm
 * @param {number} userData.age - Age in years
 * @param {string} userData.gender - Gender
 * @returns {Promise<object>} Calculated metrics (BMI, BMR, TDEE, etc.)
 */
export const calculateHealthMetrics = async (userData) => {
  try {
    const res = await axios.post(`${API_URL}/calculate-metrics`, userData);
    return res.data;
  } catch (err) {
    console.error('Error calculating metrics:', err);
    throw new Error(err.response?.data?.message || 'Failed to calculate health metrics');
  }
};

// Error interceptor for diet-specific error handling
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle specific diet API errors
    if (error.response?.status === 400) {
      console.error('Invalid diet plan data');
    } else if (error.response?.status === 503) {
      console.error('AI service temporarily unavailable');
    }
    
    return Promise.reject(error);
  }
);