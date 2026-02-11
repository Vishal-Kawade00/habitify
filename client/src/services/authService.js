import axios from 'axios';

// The base URL for your authentication API routes
const API_URL = '/api/auth';

/**
 * Sets the authorization token for all subsequent axios requests.
 * @param {string | null} token - The JWT token or null to remove it.
 */
export const setAuthToken = (token) => {
  if (token) {
    // Apply auth token to every request if logged in
    axios.defaults.headers.common['x-auth-token'] = token;
  } else {
    // Delete the auth header
    delete axios.defaults.headers.common['x-auth-token'];
  }
};

/**
 * Saves the JWT token to local storage and sets the axios header.
 * @param {string} token - The JWT token.
 */
export const saveAuthToken = (token) => {
  localStorage.setItem('token', token);
  setAuthToken(token);
};

/**
 * Removes the JWT token from local storage and clears the axios header.
 */
export const removeAuthToken = () => {
  localStorage.removeItem('token');
  setAuthToken(null);
};

/**
 * Gets the JWT token from local storage.
 * @returns {string | null} The token or null if not found.
 */
export const getAuthToken = () => {
  return localStorage.getItem('token');
};

/**
 * Logs in a user.
 * @param {string} email - The user's email.
 * @param {string} password - The user's password.
 * @returns {Promise<object>} The server response (e.g., { token }).
 */
export const login = async (email, password) => {
  try {
    // Validate inputs before sending
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const res = await axios.post(`${API_URL}/login`, { email, password });
    
    if (res.data.token) {
      saveAuthToken(res.data.token);
    }
    return res.data;
  } catch (error) {
    // Log detailed error information
    console.error('Login error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
    
    // Re-throw with more context
    if (error.response?.data?.msg) {
      throw new Error(error.response.data.msg);
    }
    throw error;
  }
};

/**
 * Signs up a new user.
 * @param {string} name - The user's name.
 * @param {string} email - The user's email.
 * @param {string} password - The user's password.
 * @returns {Promise<object>} The server response (e.g., { token }).
 */
export const signup = async (name, email, password) => {
  try {
    // Validate inputs before sending
    if (!name || !email || !password) {
      throw new Error('All fields are required');
    }

    console.log('Signup request:', { name: name ? 'provided' : 'missing', email: email ? 'provided' : 'missing', password: password ? 'provided' : 'missing' });
    
    const res = await axios.post(`${API_URL}/register`, { name, email, password });
    
    if (res.data.token) {
      saveAuthToken(res.data.token);
    }
    return res.data;
  } catch (error) {
    // Log detailed error information
    console.error('Signup error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
    
    // Re-throw with more context
    if (error.response?.data?.msg) {
      throw new Error(error.response.data.msg);
    }
    throw error;
  }
};

/**
 * Logs out the user by clearing the token.
 */
export const logout = () => {
  removeAuthToken();
};

/**
 * Fetches the authenticated user's data using their token.
 * This is used to verify an existing session.
 * @returns {Promise<object>} The user object.
 */
export const loadUser = async () => {
  // Set token header first if it exists
  const token = getAuthToken();
  if (token) {
    setAuthToken(token);
  }
  
  const res = await axios.get(`${API_URL}/user`);
  return res.data; // This should be the user object
};
