const mongoose = require('mongoose');

const DeadlineSchema = new mongoose.Schema({
  studentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  dueDate:     { type: Date, required: true },
  priority:    { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status:      { type: String, enum: ['upcoming', 'completed', 'missed'], default: 'upcoming' },
  createdAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('Deadline', DeadlineSchema);
