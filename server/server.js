const express = require('express');
const connectDB = require('./config/db.js');
const cors = require('cors');

// Import route files
const habitRoutes = require('./routes/habits.js');
const completionRoutes = require('./routes/completionRoutes.js');
const dietRoutes = require('./routes/diet.js');
const authRoutes = require('./routes/auth.js'); // <--- Import Auth Routes

// Initialize Express app
const app = express();

// ==========================================
// 1. CONNECT TO DATABASE
// ==========================================
connectDB();

// ==========================================
// 2. MIDDLEWARE
// ==========================================

// CORS Configuration
// Allow requests from your frontend during development
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173', // Vite default port
  'http://localhost:3000', // React default port
  'http://localhost:5174', // Vite alternative port
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
].filter(Boolean); // Remove undefined values

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests) in development
    if (!origin || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Body parser middleware
// Parse JSON request bodies (limit size to prevent abuse)
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies (for form submissions)
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware (helpful for debugging)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    // Sanitize logs: don't log passwords
    const logBody = { ...req.body };
    if (logBody.password) logBody.password = '*****';
    console.log('  Body:', JSON.stringify(logBody, null, 2));
  }
  next();
});

// ==========================================
// 3. API ROUTES
// ==========================================

// Health check route
app.get('/', (req, res) => {
  res.json({
    message: 'Habit Tracker API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// API status endpoint
app.get('/api', (req, res) => {
  res.json({
    status: 'success',
    message: 'API endpoints are operational',
    endpoints: {
      habits: '/api/habits',
      completions: '/api/completions',
      diet: '/api/diet',
      auth: '/api/auth', // <--- Add to status response
    },
  });
});

// Mount route handlers
app.use('/api/habits', habitRoutes);
app.use('/api/completions', completionRoutes);
app.use('/api/diet', dietRoutes);
app.use('/api/auth', authRoutes); // <--- Mount Auth Routes

// ==========================================
// 4. ERROR HANDLING
// ==========================================

// 404 Handler - Catch all undefined routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: errors,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate entry. This record already exists.',
      field: Object.keys(err.keyPattern)[0],
    });
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
    });
  }

  // JWT errors (if you add authentication later)
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ==========================================
// 5. GRACEFUL SHUTDOWN
// ==========================================

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  if (server) {
      server.close(() => {
        process.exit(1);
      });
  } else {
      process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Handle SIGTERM (for graceful shutdown)
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
  if (server) {
      server.close(() => {
        console.log('💥 Process terminated!');
      });
  }
});

// ==========================================
// 6. START SERVER
// ==========================================

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API URL: http://localhost:${PORT}`);
  console.log(`📊 Health Check: http://localhost:${PORT}/api`);
  console.log('='.repeat(50));
});

module.exports = app; // Export for testing purposes