const express   = require('express');
const router    = express.Router();
const mongoose  = require('mongoose');
const auth      = require('../middleware/auth');
const upload    = require('../middleware/upload');
const Deadline  = require('../models/Deadline');
const { getBucket } = require('../config/gridfs');

// GET /api/deadlines
router.get('/', auth, async (req, res) => {
  try {
    const deadlines = await Deadline.find({ studentId: req.student.id }).sort({ dueDate: 1 });
    res.json(deadlines);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/deadlines
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, dueDate, priority } = req.body;
    if (!title || !dueDate) return res.status(400).json({ error: 'Title and due date are required.' });
    const deadline = await Deadline.create({ studentId: req.student.id, title, description, dueDate, priority });
    res.status(201).json(deadline);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/deadlines/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const deadline = await Deadline.findOneAndUpdate(
      { _id: req.params.id, studentId: req.student.id },
      { $set: req.body },
      { new: true }
    );
    if (!deadline) return res.status(404).json({ error: 'Deadline not found.' });
    res.json(deadline);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/deadlines/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const deadline = await Deadline.findOneAndDelete({ _id: req.params.id, studentId: req.student.id });
    if (!deadline) return res.status(404).json({ error: 'Deadline not found.' });
    res.json({ message: 'Deadline deleted.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/deadlines/:id/status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const deadline = await Deadline.findOneAndUpdate(
      { _id: req.params.id, studentId: req.student.id },
      { $set: { status } },
      { new: true }
    );
    if (!deadline) return res.status(404).json({ error: 'Deadline not found.' });
    res.json(deadline);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/deadlines/:id/attachments  — upload file
router.post('/:id/attachments', auth, upload.single('file'), async (req, res) => {
  try {
    const deadline = await Deadline.findOne({ _id: req.params.id, studentId: req.student.id });
    if (!deadline) return res.status(404).json({ error: 'Deadline not found.' });
    if (!req.file)  return res.status(400).json({ error: 'No file provided.' });

    const bucket   = getBucket();
    const filename = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;

    const fileId = await new Promise((resolve, reject) => {
      const stream = bucket.openUploadStream(filename, {
        contentType: req.file.mimetype,
        metadata: { entityType: 'deadline', entityId: deadline._id.toString(), ownerId: req.student.id }
      });
      stream.on('error', reject);
      stream.on('finish', () => resolve(stream.id));
      stream.end(req.file.buffer);
    });

    deadline.attachments.push({ fileId, filename, originalName: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size });
    await deadline.save();
    res.status(201).json(deadline.attachments[deadline.attachments.length - 1]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/deadlines/:id/attachments/:fileId  — delete attachment
router.delete('/:id/attachments/:fileId', auth, async (req, res) => {
  try {
    const deadline = await Deadline.findOne({ _id: req.params.id, studentId: req.student.id });
    if (!deadline) return res.status(404).json({ error: 'Deadline not found.' });

    const fileObjId = new mongoose.Types.ObjectId(req.params.fileId);
    const idx = deadline.attachments.findIndex(a => a.fileId.equals(fileObjId));
    if (idx === -1) return res.status(404).json({ error: 'Attachment not found.' });

    const bucket = getBucket();
    await bucket.delete(fileObjId);

    deadline.attachments.splice(idx, 1);
    await deadline.save();
    res.json({ message: 'Attachment deleted.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
