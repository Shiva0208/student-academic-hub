const mongoose = require('mongoose');

const GroupInvitationSchema = new mongoose.Schema({
  groupId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Group',   required: true },
  invitedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  invitedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  status:      { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  createdAt:   { type: Date, default: Date.now }
});

// One pending invite per user per group at a time
GroupInvitationSchema.index({ groupId: 1, invitedUser: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } });

module.exports = mongoose.model('GroupInvitation', GroupInvitationSchema);
