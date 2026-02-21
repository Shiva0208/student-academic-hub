/**
 * seed.js — Creates all MongoDB collections with sample data
 * Run once: node seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const Student       = require('./server/models/Student');
const Note          = require('./server/models/Note');
const Project       = require('./server/models/Project');
const Deadline      = require('./server/models/Deadline');
const Group         = require('./server/models/Group');
const GroupResource = require('./server/models/GroupResource');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      Student.deleteMany({}),
      Note.deleteMany({}),
      Project.deleteMany({}),
      Deadline.deleteMany({}),
      Group.deleteMany({}),
      GroupResource.deleteMany({})
    ]);
    console.log('🗑️  Cleared existing data');

    // ── Students ──────────────────────────────────────────
    const password = await bcrypt.hash('password123', 10);
    const [alice, bob] = await Student.insertMany([
      { name: 'Alice Johnson', email: 'alice@student.com', password },
      { name: 'Bob Smith',     email: 'bob@student.com',   password }
    ]);
    console.log('👩‍🎓 Students created');

    // ── Notes ─────────────────────────────────────────────
    const [note1, note2, note3] = await Note.insertMany([
      {
        studentId: alice._id,
        title:     'Introduction to Calculus',
        subject:   'Mathematics',
        content:   'Calculus is the mathematical study of continuous change.\n\nKey concepts:\n- Limits\n- Derivatives\n- Integrals\n- The Fundamental Theorem of Calculus',
        isShared:  true
      },
      {
        studentId: alice._id,
        title:     'Newton\'s Laws of Motion',
        subject:   'Physics',
        content:   '1st Law: An object at rest stays at rest.\n2nd Law: F = ma\n3rd Law: For every action there is an equal and opposite reaction.',
        isShared:  false
      },
      {
        studentId: bob._id,
        title:     'Data Structures Overview',
        subject:   'Computer Science',
        content:   'Arrays, Linked Lists, Stacks, Queues, Trees, Graphs, Hash Tables.\n\nBig O Notation:\n- O(1) Constant\n- O(n) Linear\n- O(log n) Logarithmic',
        isShared:  true
      }
    ]);
    console.log('📝 Notes created');

    // ── Projects ──────────────────────────────────────────
    const [proj1, proj2] = await Project.insertMany([
      {
        studentId:   alice._id,
        title:       'Physics Lab Report — Pendulum Experiment',
        description: 'Measure the effect of string length on pendulum period. Hypothesis: period increases with string length.',
        status:      'in_progress',
        dueDate:     new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        isShared:    true
      },
      {
        studentId:   alice._id,
        title:       'Math Assignment Chapter 5',
        description: 'Complete exercises 5.1 to 5.8 on differentiation.',
        status:      'pending',
        dueDate:     new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
        isShared:    false
      },
      {
        studentId:   bob._id,
        title:       'Database Design Project',
        description: 'Design a normalized relational schema for a library management system.',
        status:      'completed',
        dueDate:     new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        isShared:    true
      }
    ]);
    console.log('📁 Projects created');

    // ── Deadlines ─────────────────────────────────────────
    await Deadline.insertMany([
      {
        studentId:   alice._id,
        title:       'Submit Physics Lab Report',
        description: 'Upload to student portal by end of day.',
        dueDate:     new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        priority:    'high',
        status:      'upcoming'
      },
      {
        studentId:   alice._id,
        title:       'Calculus Mid-Term Exam',
        description: 'Chapters 1–4. Bring scientific calculator.',
        dueDate:     new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        priority:    'high',
        status:      'upcoming'
      },
      {
        studentId:   alice._id,
        title:       'English Essay Draft',
        description: 'First draft of comparative essay.',
        dueDate:     new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        priority:    'medium',
        status:      'upcoming'
      },
      {
        studentId:   alice._id,
        title:       'Library Book Return',
        description: 'Return "Introduction to Algorithms" to library.',
        dueDate:     new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // yesterday
        priority:    'low',
        status:      'missed'
      },
      {
        studentId:   bob._id,
        title:       'Database Project Submission',
        description: 'Submit final ER diagram and SQL scripts.',
        dueDate:     new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        priority:    'high',
        status:      'completed'
      }
    ]);
    console.log('⏰ Deadlines created');

    // ── Groups ────────────────────────────────────────────
    const group = await Group.create({
      name:        'Science Study Group',
      description: 'Physics, Chemistry and Math collaboration group.',
      createdBy:   alice._id,
      inviteCode:  'SCI001',
      members: [
        { studentId: alice._id, role: 'admin' },
        { studentId: bob._id,   role: 'member' }
      ]
    });
    console.log('👥 Group created  — Invite Code: SCI001');

    // ── Group Resources ───────────────────────────────────
    await GroupResource.insertMany([
      { groupId: group._id, resourceType: 'note',    resourceId: note1._id,  sharedBy: alice._id },
      { groupId: group._id, resourceType: 'project', resourceId: proj1._id,  sharedBy: alice._id },
      { groupId: group._id, resourceType: 'note',    resourceId: note3._id,  sharedBy: bob._id   }
    ]);
    console.log('🔗 Group resources shared');

    // ── Summary ───────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Database seeded successfully!\n');
    console.log('Collections created:');
    console.log('  • students       (2 documents)');
    console.log('  • notes          (3 documents)');
    console.log('  • projects       (3 documents)');
    console.log('  • deadlines      (5 documents)');
    console.log('  • groups         (1 document)');
    console.log('  • groupresources (3 documents)');
    console.log('\nLogin credentials:');
    console.log('  Email   : alice@student.com');
    console.log('  Password: password123');
    console.log('\n  Email   : bob@student.com');
    console.log('  Password: password123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
