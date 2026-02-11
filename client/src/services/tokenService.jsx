import axios from 'axios';

const TOKEN_KEY = 'token';

/**
 * Stores the JWT token in local storage and sets the default axios auth header.
 * @param {string} token - The JWT token.
 */
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    // Use x-auth-token header to match backend middleware
    axios.defaults.headers.common['x-auth-token'] = token;
  } else {
    // If called with no token, remove it
    removeAuthToken();
  }
};

/**
 * Removes the JWT token from local storage and deletes the axios auth header.
 */
export const removeAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  delete axios.defaults.headers.common['x-auth-token'];
};

/**
 * Retrieves the JWT token from local storage.
 * @returns {string | null} The stored token, or null if not found.
 */
export const getAuthToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Decodes the JWT token to get user information.
 * @param {string} token - The JWT token.
 * @returns {object | null} The decoded user object, or null if invalid.
 */
export const decodeToken = (token) => {
  if (!token) return null;
  try {
    // Decodes the payload part (the second part) of the JWT
    const payload = JSON.parse(atob(token.split('.')[1]));

    // Check if token is expired
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      console.warn('Token expired.');
      removeAuthToken(); // Clean up expired token
      return null;
    }

    return payload; // Returns the decoded user data (e.g., { id, name })
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
};
