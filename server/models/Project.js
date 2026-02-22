const mongoose = require('mongoose');
const AttachmentSchema = require('./AttachmentSchema');

const ProjectSchema = new mongoose.Schema({
  studentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  status:      { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
  dueDate:     { type: Date },
  isShared:    { type: Boolean, default: false },
  attachments: { type: [AttachmentSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Project', ProjectSchema);
