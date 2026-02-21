const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const Note    = require('../models/Note');

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

module.exports = router;
