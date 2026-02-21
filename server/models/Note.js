const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  title:     { type: String, required: true, trim: true },
  content:   { type: String, default: '' },
  subject:   { type: String, default: '' },
  isShared:  { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Note', NoteSchema);
