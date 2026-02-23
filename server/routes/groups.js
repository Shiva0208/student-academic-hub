const express          = require('express');
const router           = express.Router();
const mongoose         = require('mongoose');
const auth             = require('../middleware/auth');
const upload           = require('../middleware/upload');
const Group            = require('../models/Group');
const GroupResource    = require('../models/GroupResource');
const GroupFile        = require('../models/GroupFile');
const GroupInvitation  = require('../models/GroupInvitation');
const Note             = require('../models/Note');
const Project          = require('../models/Project');
const Student          = require('../models/Student');
const { getBucket }    = require('../config/gridfs');

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
      createdBy:  req.student.id,
      inviteCode: genCode(),
      members:    [{ studentId: req.student.id, role: 'admin' }]
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

    const already = group.members.some(m => String(m.studentId) === String(req.student.id));
    if (already) return res.status(400).json({ error: `You are already a member of "${group.name}".` });

    group.members.push({ studentId: req.student.id, role: 'member' });
    await group.save();
    res.json(group);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Invitation routes (must be before /:id to avoid param conflicts) ────────

// GET /api/groups/invitations  — my pending invitations (as invitee)
router.get('/invitations', auth, async (req, res) => {
  try {
    const invitations = await GroupInvitation.find({
      invitedUser: req.student.id,
      status:      'pending'
    })
      .populate('groupId',   'name inviteCode')
      .populate('invitedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(invitations);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/groups/invitations/:invId/respond  — accept or reject
router.patch('/invitations/:invId/respond', auth, async (req, res) => {
  try {
    const { status } = req.body; // 'accepted' or 'rejected'
    if (!['accepted', 'rejected'].includes(status))
      return res.status(400).json({ error: 'Status must be accepted or rejected.' });

    const inv = await GroupInvitation.findOne({
      _id:         req.params.invId,
      invitedUser: req.student.id,
      status:      'pending'
    });
    if (!inv) return res.status(404).json({ error: 'Invitation not found or already responded.' });

    inv.status = status;
    await inv.save();

    if (status === 'accepted') {
      const group = await Group.findById(inv.groupId);
      if (group) {
        const already = group.members.some(m => String(m.studentId) === String(req.student.id));
        if (!already) {
          group.members.push({ studentId: req.student.id, role: 'member' });
          await group.save();
        }
      }
    }

    res.json({ message: `Invitation ${status}.`, status });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/groups/stats/dashboard  — dashboard summary (must stay before /:id)
router.get('/stats/dashboard', auth, async (req, res) => {
  try {
    const groups = await Group.find({ 'members.studentId': req.student.id });
    res.json({ count: groups.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Group-specific routes (:id) ──────────────────────────────────────────────

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

    const isMember = group.members.some(m => String(m.studentId) === String(req.student.id));
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

// POST /api/groups/:id/invite  — admin invites a student by email
router.post('/:id/invite', auth, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    const isAdmin = group.members.some(
      m => String(m.studentId) === String(req.student.id) && m.role === 'admin'
    );
    if (!isAdmin) return res.status(403).json({ error: 'Only the group admin can invite members.' });

    const invitee = await Student.findOne({ email: email.toLowerCase().trim() });
    if (!invitee) return res.status(404).json({ error: `No student found with email "${email}".` });

    if (String(invitee._id) === String(req.student.id))
      return res.status(400).json({ error: 'You cannot invite yourself.' });

    const alreadyMember = group.members.some(m => String(m.studentId) === String(invitee._id));
    if (alreadyMember) return res.status(400).json({ error: `${invitee.name} is already a member.` });

    // Check for an existing pending invite
    const existing = await GroupInvitation.findOne({
      groupId:     group._id,
      invitedUser: invitee._id,
      status:      'pending'
    });
    if (existing) return res.status(400).json({ error: `A pending invitation already exists for ${invitee.name}.` });

    const inv = await GroupInvitation.create({
      groupId:     group._id,
      invitedBy:   req.student.id,
      invitedUser: invitee._id
    });

    const populated = await GroupInvitation.findById(inv._id)
      .populate('invitedUser', 'name email')
      .populate('invitedBy',   'name email');

    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/groups/:id/invitations  — admin sees all invitations for their group
router.get('/:id/invitations', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    const isAdmin = group.members.some(
      m => String(m.studentId) === String(req.student.id) && m.role === 'admin'
    );
    if (!isAdmin) return res.status(403).json({ error: 'Only the group admin can view invitations.' });

    const invitations = await GroupInvitation.find({ groupId: group._id })
      .populate('invitedUser', 'name email')
      .populate('invitedBy',   'name email')
      .sort({ createdAt: -1 });

    res.json(invitations);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/groups/:id/share  — share note/project to group
router.post('/:id/share', auth, async (req, res) => {
  try {
    const { resourceType, resourceId } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    const isMember = group.members.some(m => String(m.studentId) === String(req.student.id));
    if (!isMember) return res.status(403).json({ error: 'Access denied.' });

    const exists = await GroupResource.findOne({ groupId: req.params.id, resourceType, resourceId });
    if (exists) return res.status(400).json({ error: 'Already shared to this group.' });

    const gr = await GroupResource.create({
      groupId:      req.params.id,
      resourceType,
      resourceId,
      sharedBy: req.student.id
    });
    res.status(201).json(gr);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/groups/:id  — delete group (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    const isAdmin = group.members.some(
      m => String(m.studentId) === String(req.student.id) && m.role === 'admin'
    );
    if (!isAdmin) return res.status(403).json({ error: 'Only the group admin can delete this group.' });

    const groupFiles = await GroupFile.find({ groupId: group._id });
    if (groupFiles.length) {
      const bucket = getBucket();
      await Promise.all(groupFiles.map(f => bucket.delete(f.fileId).catch(() => {})));
      await GroupFile.deleteMany({ groupId: group._id });
    }

    await GroupResource.deleteMany({ groupId: group._id });
    await GroupInvitation.deleteMany({ groupId: group._id });
    await Group.deleteOne({ _id: group._id });

    res.json({ message: 'Group deleted.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/groups/:id/leave
router.delete('/:id/leave', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    group.members = group.members.filter(m => String(m.studentId) !== String(req.student.id));
    await group.save();
    res.json({ message: 'You have left the group.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/groups/:id/files  — upload file to group
router.post('/:id/files', auth, upload.single('file'), async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    const isMember = group.members.some(m => String(m.studentId) === String(req.student.id));
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
      groupId:      group._id,
      fileId,
      filename,
      originalName: req.file.originalname,
      mimetype:     req.file.mimetype,
      size:         req.file.size,
      uploadedBy:   req.student.id
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

    const isMember = group.members.some(m => String(m.studentId) === String(req.student.id));
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

    const isMember = group.members.some(m => String(m.studentId) === String(req.student.id));
    if (!isMember) return res.status(403).json({ error: 'Access denied.' });

    const groupFile = await GroupFile.findOne({ _id: req.params.groupFileId, groupId: req.params.id });
    if (!groupFile) return res.status(404).json({ error: 'File not found.' });

    if (String(groupFile.uploadedBy) !== String(req.student.id)) {
      return res.status(403).json({ error: 'Only the uploader can delete this file.' });
    }

    const bucket = getBucket();
    await bucket.delete(groupFile.fileId);
    await GroupFile.deleteOne({ _id: groupFile._id });
    res.json({ message: 'File deleted.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
