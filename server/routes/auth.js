const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // We will create this middleware next
const { registerUser, loginUser, getUser } = require('../controllers/authController');

// Register User
router.post('/register', registerUser);

// Login User
router.post('/login', loginUser);

// Get User Data (Protected)
router.get('/user', auth, getUser);

module.exports = router;