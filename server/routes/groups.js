const express       = require('express');
const router        = express.Router();
const mongoose      = require('mongoose');
const auth          = require('../middleware/auth');
const upload        = require('../middleware/upload');
const Group         = require('../models/Group');
const GroupResource = require('../models/GroupResource');
const GroupFile     = require('../models/GroupFile');
const Note          = require('../models/Note');
const Project       = require('../models/Project');
const { getBucket } = require('../config/gridfs');

// Helper: random 6-char invite code
const genCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// GET /api/groups  — my groups
router.get('/', auth, async (req, res) => {
  try {
    const groups = await Group.find({ 'members.studentId': req.student.id })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(groups);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/groups  — create group
router.post('/', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Group name is required.' });

    const group = await Group.create({
      name,
      description,
      createdBy: req.student.id,
      inviteCode: genCode(),
      members: [{ studentId: req.student.id, role: 'admin' }]
    });
    res.status(201).json(group);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/groups/join  — join by invite code
router.post('/join', auth, async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) return res.status(400).json({ error: 'Invite code is required.' });

    const group = await Group.findOne({ inviteCode: inviteCode.toUpperCase() });
    if (!group) return res.status(404).json({ error: 'Invalid invite code.' });

    const already = group.members.some(m => m.studentId.toString() === req.student.id);
    if (already) return res.status(400).json({ error: 'You are already a member.' });

    group.members.push({ studentId: req.student.id, role: 'member' });
    await group.save();
    res.json(group);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/groups/:id  — group details + members
router.get('/:id', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members.studentId', 'name email')
      .populate('createdBy', 'name email');

    if (!group) return res.status(404).json({ error: 'Group not found.' });

    const isMember = group.members.some(m => m.studentId && m.studentId._id.toString() === req.student.id);
    if (!isMember) return res.status(403).json({ error: 'Access denied. Not a member.' });

    res.json(group);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/groups/:id/resources  — shared resources
router.get('/:id/resources', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    const isMember = group.members.some(m => m.studentId.toString() === req.student.id);
    if (!isMember) return res.status(403).json({ error: 'Access denied.' });

    const resources = await GroupResource.find({ groupId: req.params.id })
      .populate('sharedBy', 'name')
      .sort({ sharedAt: -1 });

    const populated = await Promise.all(resources.map(async (r) => {
      let data = null;
      if (r.resourceType === 'note') data = await Note.findById(r.resourceId);
      else data = await Project.findById(r.resourceId);
      return { ...r.toObject(), resource: data };
    }));

    res.json(populated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/groups/:id/share  — share note/project to group
router.post('/:id/share', auth, async (req, res) => {
  try {
    const { resourceType, resourceId } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    const isMember = group.members.some(m => m.studentId.toString() === req.student.id);
    if (!isMember) return res.status(403).json({ error: 'Access denied.' });

    const exists = await GroupResource.findOne({ groupId: req.params.id, resourceType, resourceId });
    if (exists) return res.status(400).json({ error: 'Already shared to this group.' });

    const gr = await GroupResource.create({
      groupId: req.params.id,
      resourceType,
      resourceId,
      sharedBy: req.student.id
    });
    res.status(201).json(gr);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/groups/:id/leave
router.delete('/:id/leave', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    group.members = group.members.filter(m => m.studentId.toString() !== req.student.id);
    await group.save();
    res.json({ message: 'You have left the group.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/groups/:id/files  — upload file to group
router.post('/:id/files', auth, upload.single('file'), async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    const isMember = group.members.some(m => m.studentId.toString() === req.student.id);
    if (!isMember) return res.status(403).json({ error: 'Access denied.' });
    if (!req.file)  return res.status(400).json({ error: 'No file provided.' });

    const bucket   = getBucket();
    const filename = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;

    const fileId = await new Promise((resolve, reject) => {
      const stream = bucket.openUploadStream(filename, {
        contentType: req.file.mimetype,
        metadata: { entityType: 'group', entityId: group._id.toString(), uploadedBy: req.student.id }
      });
      stream.on('error', reject);
      stream.on('finish', () => resolve(stream.id));
      stream.end(req.file.buffer);
    });

    const groupFile = await GroupFile.create({
      groupId: group._id,
      fileId,
      filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.student.id
    });
    res.status(201).json(groupFile);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/groups/:id/files  — list group files
router.get('/:id/files', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    const isMember = group.members.some(m => m.studentId.toString() === req.student.id);
    if (!isMember) return res.status(403).json({ error: 'Access denied.' });

    const files = await GroupFile.find({ groupId: req.params.id })
      .populate('uploadedBy', 'name')
      .sort({ uploadedAt: -1 });
    res.json(files);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/groups/:id/files/:groupFileId  — delete group file
router.delete('/:id/files/:groupFileId', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    const isMember = group.members.some(m => m.studentId.toString() === req.student.id);
    if (!isMember) return res.status(403).json({ error: 'Access denied.' });

    const groupFile = await GroupFile.findOne({ _id: req.params.groupFileId, groupId: req.params.id });
    if (!groupFile) return res.status(404).json({ error: 'File not found.' });

    if (groupFile.uploadedBy.toString() !== req.student.id) {
      return res.status(403).json({ error: 'Only the uploader can delete this file.' });
    }

    const bucket = getBucket();
    await bucket.delete(groupFile.fileId);
    await GroupFile.deleteOne({ _id: groupFile._id });
    res.json({ message: 'File deleted.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/groups/stats/dashboard  — for dashboard summary
router.get('/stats/dashboard', auth, async (req, res) => {
  try {
    const groups = await Group.find({ 'members.studentId': req.student.id });
    res.json({ count: groups.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
