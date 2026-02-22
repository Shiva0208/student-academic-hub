const mongoose = require('mongoose');

const AttachmentSchema = new mongoose.Schema({
  fileId:       { type: mongoose.Schema.Types.ObjectId, required: true },
  filename:     { type: String, required: true },
  originalName: { type: String, required: true },
  mimetype:     { type: String, required: true },
  size:         { type: Number, required: true },
  uploadedAt:   { type: Date, default: Date.now }
}, { _id: false });

module.exports = AttachmentSchema;
