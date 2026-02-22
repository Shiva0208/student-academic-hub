const mongoose = require('mongoose');

const GroupFileSchema = new mongoose.Schema({
  groupId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  fileId:       { type: mongoose.Schema.Types.ObjectId, required: true },
  filename:     { type: String, required: true },
  originalName: { type: String, required: true },
  mimetype:     { type: String, required: true },
  size:         { type: Number, required: true },
  uploadedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  uploadedAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('GroupFile', GroupFileSchema);
