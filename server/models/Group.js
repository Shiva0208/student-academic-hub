const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  inviteCode:  { type: String, unique: true },
  members: [{
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    role:      { type: String, enum: ['admin', 'member'], default: 'member' },
    joinedAt:  { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Group', GroupSchema);
