const mongoose = require('mongoose');

const GroupResourceSchema = new mongoose.Schema({
  groupId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  resourceType: { type: String, enum: ['note', 'project'], required: true },
  resourceId:   { type: mongoose.Schema.Types.ObjectId, required: true },
  sharedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  sharedAt:     { type: Date, default: Date.now }
});

module.exports = mongoose.model('GroupResource', GroupResourceSchema);
