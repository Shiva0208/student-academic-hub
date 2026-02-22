const express   = require('express');
const router    = express.Router();
const mongoose  = require('mongoose');
const auth      = require('../middleware/auth');
const upload    = require('../middleware/upload');
const Note      = require('../models/Note');
const { getBucket } = require('../config/gridfs');

// GET /api/notes
router.get('/', auth, async (req, res) => {
  try {
    const notes = await Note.find({ studentId: req.student.id }).sort({ updatedAt: -1 });
    res.json(notes);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/notes
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, subject } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required.' });
    const note = await Note.create({ studentId: req.student.id, title, content, subject });
    res.status(201).json(note);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/notes/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, studentId: req.student.id },
      { $set: req.body },
      { new: true }
    );
    if (!note) return res.status(404).json({ error: 'Note not found.' });
    res.json(note);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/notes/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, studentId: req.student.id });
    if (!note) return res.status(404).json({ error: 'Note not found.' });
    res.json({ message: 'Note deleted.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/notes/:id/share  — toggle share
router.patch('/:id/share', auth, async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, studentId: req.student.id });
    if (!note) return res.status(404).json({ error: 'Note not found.' });
    note.isShared = !note.isShared;
    await note.save();
    res.json(note);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/notes/:id/attachments  — upload file
router.post('/:id/attachments', auth, upload.single('file'), async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, studentId: req.student.id });
    if (!note) return res.status(404).json({ error: 'Note not found.' });
    if (!req.file)  return res.status(400).json({ error: 'No file provided.' });

    const bucket   = getBucket();
    const filename = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;

    const fileId = await new Promise((resolve, reject) => {
      const stream = bucket.openUploadStream(filename, {
        contentType: req.file.mimetype,
        metadata: { entityType: 'note', entityId: note._id.toString(), ownerId: req.student.id }
      });
      stream.on('error', reject);
      stream.on('finish', () => resolve(stream.id));
      stream.end(req.file.buffer);
    });

    note.attachments.push({ fileId, filename, originalName: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size });
    await note.save();
    res.status(201).json(note.attachments[note.attachments.length - 1]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/notes/:id/attachments/:fileId  — delete attachment
router.delete('/:id/attachments/:fileId', auth, async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, studentId: req.student.id });
    if (!note) return res.status(404).json({ error: 'Note not found.' });

    const fileObjId = new mongoose.Types.ObjectId(req.params.fileId);
    const idx = note.attachments.findIndex(a => a.fileId.equals(fileObjId));
    if (idx === -1) return res.status(404).json({ error: 'Attachment not found.' });

    const bucket = getBucket();
    await bucket.delete(fileObjId);

    note.attachments.splice(idx, 1);
    await note.save();
    res.json({ message: 'Attachment deleted.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
