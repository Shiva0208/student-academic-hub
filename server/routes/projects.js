const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const Project = require('../models/Project');

// GET /api/projects
router.get('/', auth, async (req, res) => {
  try {
    const projects = await Project.find({ studentId: req.student.id }).sort({ updatedAt: -1 });
    res.json(projects);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/projects
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, status, dueDate } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required.' });
    const project = await Project.create({ studentId: req.student.id, title, description, status, dueDate });
    res.status(201).json(project);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/projects/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, studentId: req.student.id },
      { $set: req.body },
      { new: true }
    );
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    res.json(project);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/projects/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, studentId: req.student.id });
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    res.json({ message: 'Project deleted.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/projects/:id/share  — toggle share
router.patch('/:id/share', auth, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, studentId: req.student.id });
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    project.isShared = !project.isShared;
    await project.save();
    res.json(project);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
