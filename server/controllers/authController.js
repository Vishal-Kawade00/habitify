const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const User = require('../models/User');

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
exports.registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  // Log incoming request for debugging
  console.log('Register request received:', { 
    name: name ? 'provided' : 'missing', 
    email: email ? 'provided' : 'missing', 
    password: password ? 'provided' : 'missing' 
  });

  try {
    // 1. Validate input
    if (!name || !email || !password) {
      console.log('Validation failed: Missing required fields');
      return res.status(400).json({ 
        msg: 'Please provide all required fields: name, email, and password' 
      });
    }

    // Trim and validate email format (basic check)
    const trimmedEmail = email.trim();
    const normalizedEmail = trimmedEmail.toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      console.log('Validation failed: Invalid email format');
      return res.status(400).json({ msg: 'Please provide a valid email address' });
    }

    // Validate password length
    if (password.length < 6) {
      console.log('Validation failed: Password too short');
      return res.status(400).json({ msg: 'Password must be at least 6 characters long' });
    }

    // Validate name is not just whitespace
    if (!name.trim()) {
      console.log('Validation failed: Name is empty');
      return res.status(400).json({ msg: 'Name cannot be empty' });
    }

    // 2. Check if user already exists (normalize email for check)
    let user = await User.findOne({ email: normalizedEmail });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    // 3. Create new user instance
    user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password
    });

    // 4. Encrypt password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // 5. Save to Database
    await user.save();

    // 6. Return JWT (Json Web Token)
    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      config.get('jwtSecret'), // Ensure 'jwtSecret' is defined in config/default.json
      { expiresIn: 360000 },   // Token expiration (e.g., 100 hours)
      (err, token) => {
        if (err) {
          console.error('JWT Error:', err.message);
          return res.status(500).json({ msg: 'Server error: Failed to generate token' });
        }
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
      }
    );
  } catch (err) {
    console.error('Register Error:', err.message);
    
    // Handle Mongoose validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ 
        msg: errors.join(', ') || 'Validation error' 
      });
    }

    // Handle duplicate key error (email already exists)
    if (err.code === 11000) {
      return res.status(400).json({ msg: 'User with this email already exists' });
    }

    // Default error
    res.status(500).json({ msg: 'Server error' });
  }
};

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Validate input
    if (!email || !password) {
      return res.status(400).json({ msg: 'Please provide both email and password' });
    }

    // 2. Check if user exists
    let user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    // 3. Match password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    // 4. Return JWT
    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      config.get('jwtSecret'),
      { expiresIn: 360000 },
      (err, token) => {
        if (err) {
          console.error('JWT Error:', err.message);
          return res.status(500).json({ msg: 'Server error: Failed to generate token' });
        }
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
      }
    );
  } catch (err) {
    console.error('Login Error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
};

// @route   GET api/auth/user
// @desc    Get logged in user data
// @access  Private (Protected by middleware)
exports.getUser = async (req, res) => {
  try {
    // req.user is set by the auth middleware
    const user = await User.findById(req.user.id).select('-password'); // Exclude password from result
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};