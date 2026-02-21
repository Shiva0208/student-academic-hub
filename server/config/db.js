const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('👉 Make sure MongoDB is running: net start MongoDB');
    // Retry after 5 seconds instead of crashing
    setTimeout(connectDB, 5000);
  }
};

module.exports = connectDB;
