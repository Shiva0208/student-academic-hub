const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');
const auth     = require('../middleware/auth');
const { getBucket } = require('../config/gridfs');

const INLINE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// GET /api/files/:fileId — stream file from GridFS
router.get('/:fileId', auth, async (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.fileId);
    const bucket = getBucket();

    const files = await bucket.find({ _id: fileId }).toArray();
    if (!files.length) return res.status(404).json({ error: 'File not found.' });

    const file = files[0];
    const disposition = INLINE_TYPES.includes(file.contentType) ? 'inline' : 'attachment';

    res.set('Content-Type', file.contentType || 'application/octet-stream');
    res.set('Content-Disposition', `${disposition}; filename="${encodeURIComponent(file.filename)}"`);
    res.set('Content-Length', file.length);

    const stream = bucket.openDownloadStream(fileId);
    stream.on('error', () => {
      if (!res.headersSent) res.status(500).json({ error: 'Stream error.' });
    });
    stream.pipe(res);

  } catch (err) {
    if (err.message && (err.message.includes('BSONTypeError') || err.message.includes('ObjectId'))) {
      return res.status(400).json({ error: 'Invalid file ID.' });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
