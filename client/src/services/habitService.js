import axios from 'axios';

// Base URL for habit-related API endpoints with fallback
const BASE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_URL = `${BASE_API_URL}/habits`;

// Log API URL in development for debugging
if (import.meta.env.DEV) {
  console.log('🔗 API Base URL:', BASE_API_URL);
  console.log('🔗 Habits API URL:', API_URL);
}

// Configure axios defaults
axios.defaults.headers.common['Content-Type'] = 'application/json';

/**
 * Fetches all habits from the backend.
 * Corresponds to: GET /api/habits
 * @returns {Promise<Array>} Array of habit objects
 */
export const getHabits = async () => {
  try {
    const res = await axios.get(API_URL);
    // Ensure we return an array
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error('Error fetching habits:', err);
    if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
      throw new Error('Unable to connect to server. Please make sure the backend is running.');
    }
    throw new Error(err.response?.data?.message || err.message || 'Failed to fetch habits');
  }
};

/**
 * Creates a new habit.
 * Corresponds to: POST /api/habits
 * @param {object} habitData - The data for the new habit
 * @param {string} habitData.name - Name of the habit
 * @param {string} habitData.color - Color hex code for the habit
 * @param {object} habitData.frequency - Frequency settings (type: 'daily' or 'specific', days: array)
 * @param {object} habitData.goal - Goal settings (type: 'yes_no' or 'target', target: number, unit: string)
 * @returns {Promise<object>} The created habit object
 */
export const createHabit = async (habitData) => {
  try {
    // Validate required fields
    if (!habitData.name || !habitData.color) {
      throw new Error('Name and color are required');
    }
    
    const res = await axios.post(API_URL, habitData);
    if (!res.data || !res.data._id) {
      throw new Error('Invalid response from server');
    }
    return res.data;
  } catch (err) {
    console.error('Error creating habit:', err);
    if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
      throw new Error('Unable to connect to server. Please make sure the backend is running.');
    }
    throw new Error(err.response?.data?.message || err.message || 'Failed to create habit');
  }
};

/**
 * Updates an existing habit.
 * Corresponds to: PUT /api/habits/:id
 * @param {string} habitId - The ID of the habit to update
 * @param {object} habitData - The updated habit data
 * @returns {Promise<object>} The updated habit object
 */
export const updateHabit = async (habitId, habitData) => {
  try {
    const res = await axios.put(`${API_URL}/${habitId}`, habitData);
    return res.data;
  } catch (err) {
    console.error('Error updating habit:', err);
    throw new Error(err.response?.data?.message || 'Failed to update habit');
  }
};

/**
 * Gets habits that are due today.
 * Corresponds to: GET /api/habits/due-today
 * @returns {Promise<Array>} Array of habits due today with completion status
 */
export const getTodaysDueHabits = async () => {
  try {
    const res = await axios.get(`${API_URL}/due-today`);
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error('Error fetching today\'s due habits:', err);
    if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
      throw new Error('Unable to connect to the server. Please check your connection.');
    }
    throw new Error(err.response?.data?.message || 'Failed to fetch today\'s habits');
  }
};

/**
 * Gets all archived habits.
 * Corresponds to: GET /api/habits/archived
 * @returns {Promise<Array>} Array of archived habits
 */
export const getArchivedHabits = async () => {
  try {
    const res = await axios.get(`${API_URL}/archived`);
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error('Error fetching archived habits:', err);
    if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
      throw new Error('Unable to connect to the server. Please check your connection.');
    }
    throw new Error(err.response?.data?.message || 'Failed to fetch archived habits');
  }
};

/**
 * Restores an archived habit.
 * Corresponds to: POST /api/habits/:id/restore
 * @param {string} habitId - The ID of the habit to restore
 * @returns {Promise<object>} The restored habit object
 */
export const restoreHabit = async (habitId) => {
  try {
    if (!habitId) {
      throw new Error('Habit ID is required');
    }
    const res = await axios.post(`${API_URL}/${habitId}/restore`);
    return res.data;
  } catch (err) {
    console.error('Error restoring habit:', err);
    throw new Error(err.response?.data?.message || 'Failed to restore habit');
  }
};

/**
 * Gets habits and completions for a specific date.
 * Corresponds to: GET /api/habits/calendar/date/:date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<object>} Date data with habits and completion info
 */
export const getHabitsForDate = async (date) => {
  try {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('Invalid date format. Use YYYY-MM-DD');
    }
    const res = await axios.get(`${API_URL}/calendar/date/${date}`);
    return res.data;
  } catch (err) {
    console.error('Error fetching habits for date:', err);
    throw new Error(err.response?.data?.message || 'Failed to fetch habits for date');
  }
};

/**
 * Gets calendar heatmap data for a month.
 * Corresponds to: GET /api/habits/calendar/month/:year/:month
 * @param {number} year - Year (e.g., 2024)
 * @param {number} month - Month (1-12)
 * @returns {Promise<object>} Month heatmap data
 */
export const getMonthHeatmap = async (year, month) => {
  try {
    const res = await axios.get(`${API_URL}/calendar/month/${year}/${month}`);
    return res.data;
  } catch (err) {
    console.error('Error fetching month heatmap:', err);
    throw new Error(err.response?.data?.message || 'Failed to fetch month heatmap');
  }
};

/**
 * Logs a completion for a specific habit.
 * Corresponds to: POST /api/habits/:id/complete
 * @param {string} habitId - The ID of the habit to complete
 * @param {number} [value=1] - The value to log (1 for yes/no, custom number for target goals)
 * @returns {Promise<object>} The created completion object
 */
export const logCompletion = async (habitId, value = 1) => {
  try {
    if (!habitId) {
      throw new Error('Habit ID is required');
    }
    const res = await axios.post(`${API_URL}/${habitId}/complete`, { value });
    return res.data;
  } catch (err) {
    console.error('Error logging completion:', err);
    if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
      throw new Error('Unable to connect to server. Please make sure the backend is running.');
    }
    throw new Error(err.response?.data?.message || err.message || 'Failed to log completion');
  }
};

/**
 * Fetches today's completions for all habits.
 * Corresponds to: GET /api/completions/today
 * @returns {Promise<Array>} Array of today's completion objects
 */
export const getTodayCompletions = async () => {
  try {
    const res = await axios.get(`${BASE_API_URL}/completions/today`);
    // Ensure we return an array
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error('Error fetching today\'s completions:', err);
    // If server returns 404 or network error, return empty array instead of throwing
    // This allows the app to continue working even if completions endpoint fails
    if (err.code === 'ERR_NETWORK' || err.message === 'Network Error' || err.response?.status === 404) {
      console.warn('Completions endpoint not available, returning empty array');
      return [];
    }
    throw new Error(err.response?.data?.message || err.message || 'Failed to fetch completions');
  }
};

/**
 * Fetches all completions for a specific habit.
 * Corresponds to: GET /api/habits/:id/completions
 * @param {string} habitId - The ID of the habit
 * @returns {Promise<Array>} Array of completion objects for the habit
 */
export const getHabitCompletions = async (habitId) => {
  try {
    const res = await axios.get(`${API_URL}/${habitId}/completions`);
    return res.data;
  } catch (err) {
    console.error('Error fetching habit completions:', err);
    throw new Error(err.response?.data?.message || 'Failed to fetch completions');
  }
};

/**
 * Archives a habit (sets isActive to false, can be restored).
 * Corresponds to: POST /api/habits/:id/archive
 * @param {string} habitId - The ID of the habit to archive
 * @returns {Promise<object>} Success message
 */
export const archiveHabit = async (habitId) => {
  try {
    const res = await axios.post(`${API_URL}/${habitId}/archive`);
    return res.data;
  } catch (err) {
    console.error('Error archiving habit:', err);
    throw new Error(err.response?.data?.message || 'Failed to archive habit');
  }
};

/**
 * Deletes a habit (soft delete - sets deletedAt, kept for 1 month).
 * Corresponds to: DELETE /api/habits/:id
 * @param {string} habitId - The ID of the habit to delete
 * @returns {Promise<object>} Success message
 */
export const deleteHabit = async (habitId) => {
  try {
    const res = await axios.delete(`${API_URL}/${habitId}`);
    return res.data;
  } catch (err) {
    console.error('Error deleting habit:', err);
    throw new Error(err.response?.data?.message || 'Failed to delete habit');
  }
};

/**
 * Fetches statistics for a specific habit.
 * Corresponds to: GET /api/habits/:id/stats
 * @param {string} habitId - The ID of the habit
 * @returns {Promise<object>} Statistics object containing:
 *   - currentStreak: number
 *   - longestStreak: number
 *   - heatmapData: array of { date, count } objects
 *   - chartData: array of { name, value } objects for monthly progress
 */
export const getHabitStats = async (habitId) => {
  try {
    const res = await axios.get(`${API_URL}/${habitId}/stats`);
    return res.data;
  } catch (err) {
    console.error('Error fetching habit stats:', err);
    throw new Error(err.response?.data?.message || 'Failed to fetch statistics');
  }
};

/**
 * Deletes a specific completion.
 * Corresponds to: DELETE /api/completions/:id
 * @param {string} completionId - The ID of the completion to delete
 * @returns {Promise<object>} Success message
 */
export const deleteCompletion = async (completionId) => {
  try {
    const res = await axios.delete(`${BASE_API_URL}/completions/${completionId}`);
    return res.data;
  } catch (err) {
    console.error('Error deleting completion:', err);
    throw new Error(err.response?.data?.message || 'Failed to delete completion');
  }
};

/**
 * Gets a summary of all habits and their completion status.
 * Corresponds to: GET /api/habits/summary
 * @returns {Promise<object>} Summary object with habit statistics
 */
export const getHabitsSummary = async () => {
  try {
    const res = await axios.get(`${API_URL}/summary`);
    return res.data;
  } catch (err) {
    console.error('Error fetching habits summary:', err);
    throw new Error(err.response?.data?.message || 'Failed to fetch summary');
  }
};

// Error interceptor for global error handling
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle common errors
    if (error.response?.status === 401) {
      console.error('Unauthorized access');
      // Could redirect to login here if auth was implemented
    } else if (error.response?.status === 404) {
      console.error('Resource not found');
    } else if (error.response?.status === 500) {
      console.error('Server error');
    }
    
    return Promise.reject(error);
  }
);