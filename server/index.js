require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const connectDB = require('./config/db');
const { initGridFS } = require('./config/gridfs');

const app = express();

// Connect MongoDB + init GridFS
connectDB();
initGridFS();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/notes',     require('./routes/notes'));
app.use('/api/projects',  require('./routes/projects'));
app.use('/api/deadlines', require('./routes/deadlines'));
app.use('/api/groups',    require('./routes/groups'));
app.use('/api/files',     require('./routes/files'));

// Catch-all — serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Global error handler — returns JSON for multer/upload errors
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 400;
  res.status(status).json({ error: err.message || 'An error occurred.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
