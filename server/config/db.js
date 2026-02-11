const mongoose = require('mongoose');
const config = require('config'); // This package reads from default.json

// Get the mongoURI string from your config file
const db = config.get('mongoURI');

/**
 * Connects to the MongoDB database.
 */
const connectDB = async () => {
  try {
    // Attempt to connect to the database
    await mongoose.connect(db, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected...');
  } catch (err) {
    // If connection fails, log the error and exit the server
    console.error(err.message);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;

