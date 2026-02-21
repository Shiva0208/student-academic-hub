const express  = require('express');
const router   = express.Router();
const auth     = require('../middleware/auth');
const Deadline = require('../models/Deadline');

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

module.exports = router;
