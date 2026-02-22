/**
 * seed.js — Creates all MongoDB collections with sample data (including attachments)
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
const GroupFile     = require('./server/models/GroupFile');

// ── Sample file content ────────────────────────────────────────────────────
const FILES = {
  calcNotes: {
    name:    'calculus-notes.txt',
    mime:    'text/plain',
    content: Buffer.from(
      'Calculus Notes\n\n' +
      'Limits, Derivatives, and Integrals — exam preparation summary.\n\n' +
      'Key formulas:\n' +
      '  d/dx(x^n) = n*x^(n-1)\n' +
      '  Integral of x^n dx = x^(n+1)/(n+1) + C\n\n' +
      'The Fundamental Theorem of Calculus links differentiation and integration.'
    )
  },
  dsCheatsheet: {
    name:    'ds-cheatsheet.txt',
    mime:    'text/plain',
    content: Buffer.from(
      'Data Structures Cheat Sheet\n\n' +
      'Array      : O(1) access, O(n) search, O(n) insert\n' +
      'Linked List: O(n) access, O(1) insert at head\n' +
      'Hash Map   : O(1) average lookup and insert\n' +
      'BST        : O(log n) search (balanced), O(n) worst\n' +
      'Heap       : O(1) peek, O(log n) insert/delete\n\n' +
      'Use HashMap for fast lookup, BST for ordered data.'
    )
  },
  labReport: {
    name:    'pendulum-lab-report.txt',
    mime:    'text/plain',
    content: Buffer.from(
      'Physics Pendulum Lab Report\n\n' +
      'Hypothesis: Period T = 2*pi*sqrt(L/g)\n\n' +
      'Measured data:\n' +
      '  L = 0.25 m  -->  T = 1.00 s\n' +
      '  L = 0.50 m  -->  T = 1.42 s\n' +
      '  L = 1.00 m  -->  T = 2.01 s\n\n' +
      'Conclusion: Period increases proportionally to sqrt(L), confirming hypothesis.\n' +
      'Percentage error: < 1.5% across all measurements.'
    )
  },
  checklist: {
    name:    'submission-checklist.txt',
    mime:    'text/plain',
    content: Buffer.from(
      'Physics Lab Report Submission Checklist\n\n' +
      '[x] Lab report written\n' +
      '[x] Data tables complete\n' +
      '[x] Graphs plotted\n' +
      '[ ] Conclusion reviewed by lab partner\n' +
      '[ ] Uploaded to student portal\n\n' +
      'Deadline: 2 days from today. Upload via student portal before midnight.'
    )
  },
  groupSchedule: {
    name:    'group-study-schedule.txt',
    mime:    'text/plain',
    content: Buffer.from(
      'Science Study Group -- Shared Resources\n\n' +
      'Week 1: Newton\'s Laws of Motion revision\n' +
      'Week 2: Calculus integration techniques\n' +
      'Week 3: Chemistry — covalent and ionic bonding\n' +
      'Week 4: Mock exam practice\n\n' +
      'Next meeting: Friday 4 PM, Library Room 3\n' +
      'Contact: alice@student.com'
    )
  }
};

// Upload a Buffer to GridFS; resolves with the new ObjectId
function uploadToGridFS(bucket, file) {
  return new Promise((resolve, reject) => {
    const stream = bucket.openUploadStream(file.name, { contentType: file.mime });
    stream.on('error', reject);
    stream.on('finish', () => resolve(stream.id));
    stream.end(file.content);
  });
}

// Build an attachment subdocument from a file definition + its GridFS id
function makeAttachment(fileId, file) {
  return {
    fileId,
    filename:     file.name,
    originalName: file.name,
    mimetype:     file.mime,
    size:         file.content.length
  };
}

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // GridFSBucket is safe to create after connect() resolves
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'uploads'
    });

    // ── Clear existing data (including GridFS and GroupFile) ───────────────
    await Promise.all([
      Student.deleteMany({}),
      Note.deleteMany({}),
      Project.deleteMany({}),
      Deadline.deleteMany({}),
      Group.deleteMany({}),
      GroupResource.deleteMany({}),
      GroupFile.deleteMany({}),
      mongoose.connection.db.collection('uploads.files').deleteMany({}),
      mongoose.connection.db.collection('uploads.chunks').deleteMany({})
    ]);
    console.log('🗑️  Cleared existing data');

    // ── Upload seed files to GridFS ────────────────────────────────────────
    const [calcNotesId, dsCheatsheetId, labReportId, checklistId, groupScheduleId] =
      await Promise.all([
        uploadToGridFS(bucket, FILES.calcNotes),
        uploadToGridFS(bucket, FILES.dsCheatsheet),
        uploadToGridFS(bucket, FILES.labReport),
        uploadToGridFS(bucket, FILES.checklist),
        uploadToGridFS(bucket, FILES.groupSchedule)
      ]);
    console.log('📂 Seed files uploaded to GridFS (5 files)');

    // ── Students ──────────────────────────────────────────────────────────
    const password = await bcrypt.hash('password123', 10);
    const [alice, bob] = await Student.insertMany([
      { name: 'Alice Johnson', email: 'alice@student.com', password },
      { name: 'Bob Smith',     email: 'bob@student.com',   password }
    ]);
    console.log('👩‍🎓 Students created');

    // ── Notes ─────────────────────────────────────────────────────────────
    const [note1, note2, note3] = await Note.insertMany([
      {
        studentId:   alice._id,
        title:       'Introduction to Calculus',
        subject:     'Mathematics',
        content:     'Calculus is the mathematical study of continuous change.\n\nKey concepts:\n- Limits\n- Derivatives\n- Integrals\n- The Fundamental Theorem of Calculus',
        isShared:    true,
        attachments: [makeAttachment(calcNotesId, FILES.calcNotes)]
      },
      {
        studentId: alice._id,
        title:     'Newton\'s Laws of Motion',
        subject:   'Physics',
        content:   '1st Law: An object at rest stays at rest.\n2nd Law: F = ma\n3rd Law: For every action there is an equal and opposite reaction.',
        isShared:  false
      },
      {
        studentId:   bob._id,
        title:       'Data Structures Overview',
        subject:     'Computer Science',
        content:     'Arrays, Linked Lists, Stacks, Queues, Trees, Graphs, Hash Tables.\n\nBig O Notation:\n- O(1) Constant\n- O(n) Linear\n- O(log n) Logarithmic',
        isShared:    true,
        attachments: [makeAttachment(dsCheatsheetId, FILES.dsCheatsheet)]
      }
    ]);
    console.log('📝 Notes created (2 with attachments)');

    // ── Projects ──────────────────────────────────────────────────────────
    const [proj1, proj2] = await Project.insertMany([
      {
        studentId:   alice._id,
        title:       'Physics Lab Report — Pendulum Experiment',
        description: 'Measure the effect of string length on pendulum period. Hypothesis: period increases with string length.',
        status:      'in_progress',
        dueDate:     new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isShared:    true,
        attachments: [makeAttachment(labReportId, FILES.labReport)]
      },
      {
        studentId:   alice._id,
        title:       'Math Assignment Chapter 5',
        description: 'Complete exercises 5.1 to 5.8 on differentiation.',
        status:      'pending',
        dueDate:     new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        isShared:    false
      },
      {
        studentId:   bob._id,
        title:       'Database Design Project',
        description: 'Design a normalized relational schema for a library management system.',
        status:      'completed',
        dueDate:     new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        isShared:    true
      }
    ]);
    console.log('📁 Projects created (1 with attachment)');

    // ── Deadlines ─────────────────────────────────────────────────────────
    await Deadline.insertMany([
      {
        studentId:   alice._id,
        title:       'Submit Physics Lab Report',
        description: 'Upload to student portal by end of day.',
        dueDate:     new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        priority:    'high',
        status:      'upcoming',
        attachments: [makeAttachment(checklistId, FILES.checklist)]
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
        dueDate:     new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
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
    console.log('⏰ Deadlines created (1 with attachment)');

    // ── Groups ────────────────────────────────────────────────────────────
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
    console.log('👥 Group created — Invite Code: SCI001');

    // ── Group Resources ───────────────────────────────────────────────────
    await GroupResource.insertMany([
      { groupId: group._id, resourceType: 'note',    resourceId: note1._id, sharedBy: alice._id },
      { groupId: group._id, resourceType: 'project', resourceId: proj1._id, sharedBy: alice._id },
      { groupId: group._id, resourceType: 'note',    resourceId: note3._id, sharedBy: bob._id   }
    ]);
    console.log('🔗 Group resources shared (3)');

    // ── Group Files ───────────────────────────────────────────────────────
    await GroupFile.create({
      groupId:      group._id,
      fileId:       groupScheduleId,
      filename:     FILES.groupSchedule.name,
      originalName: FILES.groupSchedule.name,
      mimetype:     FILES.groupSchedule.mime,
      size:         FILES.groupSchedule.content.length,
      uploadedBy:   alice._id
    });
    console.log('📎 Group file uploaded (1)');

    // ── Summary ───────────────────────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Database seeded successfully!\n');
    console.log('Collections created:');
    console.log('  • students        2 documents');
    console.log('  • notes           3 documents  (2 with attachments)');
    console.log('  • projects        3 documents  (1 with attachment)');
    console.log('  • deadlines       5 documents  (1 with attachment)');
    console.log('  • groups          1 document');
    console.log('  • groupresources  3 documents');
    console.log('  • groupfiles      1 document');
    console.log('  • uploads.files   5 GridFS records');
    console.log('\nLogin credentials:');
    console.log('  Email   : alice@student.com');
    console.log('  Password: password123');
    console.log('\n  Email   : bob@student.com');
    console.log('  Password: password123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
