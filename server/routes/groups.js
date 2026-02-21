const express       = require('express');
const router        = express.Router();
const auth          = require('../middleware/auth');
const Group         = require('../models/Group');
const GroupResource = require('../models/GroupResource');
const Note          = require('../models/Note');
const Project       = require('../models/Project');

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

// GET /api/groups/stats/dashboard  — for dashboard summary
router.get('/stats/dashboard', auth, async (req, res) => {
  try {
    const groups = await Group.find({ 'members.studentId': req.student.id });
    res.json({ count: groups.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
