const express   = require('express');
const router    = express.Router();
const mongoose  = require('mongoose');
const auth      = require('../middleware/auth');
const upload    = require('../middleware/upload');
const Project   = require('../models/Project');
const { getBucket } = require('../config/gridfs');

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

// POST /api/projects/:id/attachments  — upload file
router.post('/:id/attachments', auth, upload.single('file'), async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, studentId: req.student.id });
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    if (!req.file)  return res.status(400).json({ error: 'No file provided.' });

    const bucket   = getBucket();
    const filename = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;

    const fileId = await new Promise((resolve, reject) => {
      const stream = bucket.openUploadStream(filename, {
        contentType: req.file.mimetype,
        metadata: { entityType: 'project', entityId: project._id.toString(), ownerId: req.student.id }
      });
      stream.on('error', reject);
      stream.on('finish', () => resolve(stream.id));
      stream.end(req.file.buffer);
    });

    project.attachments.push({ fileId, filename, originalName: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size });
    await project.save();
    res.status(201).json(project.attachments[project.attachments.length - 1]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/projects/:id/attachments/:fileId  — delete attachment
router.delete('/:id/attachments/:fileId', auth, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, studentId: req.student.id });
    if (!project) return res.status(404).json({ error: 'Project not found.' });

    const fileObjId = new mongoose.Types.ObjectId(req.params.fileId);
    const idx = project.attachments.findIndex(a => a.fileId.equals(fileObjId));
    if (idx === -1) return res.status(404).json({ error: 'Attachment not found.' });

    const bucket = getBucket();
    await bucket.delete(fileObjId);

    project.attachments.splice(idx, 1);
    await project.save();
    res.json({ message: 'Attachment deleted.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
