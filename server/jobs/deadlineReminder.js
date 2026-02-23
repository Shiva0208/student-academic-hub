const cron     = require('node-cron');
const Deadline = require('../models/Deadline');
const Student  = require('../models/Student');
const mailer   = require('../config/mailer');

function reminderEmailHtml(studentName, title, dueDate, priority) {
  const due = new Date(dueDate).toLocaleString('en-IN', {
    dateStyle: 'medium', timeStyle: 'short'
  });
  const priorityColor = priority === 'high' ? '#e74c3c' : priority === 'medium' ? '#f39c12' : '#27ae60';

  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#f5f5f5;padding:20px;">
    <div style="background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.08);">
      <div style="background:linear-gradient(135deg,#6c63ff,#5a52d5);padding:24px 30px;">
        <h2 style="color:#fff;margin:0;font-size:1.3rem;">⏰ Deadline Reminder</h2>
        <p style="color:rgba(255,255,255,.8);margin:6px 0 0;font-size:.9rem;">Student Academic Hub</p>
      </div>
      <div style="padding:28px 30px;">
        <p style="color:#333;margin:0 0 16px;">Hi <strong>${studentName}</strong>,</p>
        <p style="color:#555;margin:0 0 20px;">You have a pending deadline due in <strong>less than 1 hour</strong>. Please complete it as soon as possible.</p>

        <div style="background:#f8f7ff;border-left:4px solid #6c63ff;border-radius:6px;padding:16px 20px;margin-bottom:20px;">
          <div style="font-size:1.05rem;font-weight:700;color:#1a1a2e;margin-bottom:8px;">${title}</div>
          <div style="font-size:.85rem;color:#666;">
            <span>📅 Due: <strong style="color:#333;">${due}</strong></span><br/>
            <span style="margin-top:4px;display:inline-block;">🔴 Priority: <strong style="color:${priorityColor};">${priority.charAt(0).toUpperCase() + priority.slice(1)}</strong></span>
          </div>
        </div>

        <p style="color:#e74c3c;font-weight:600;margin:0 0 20px;">⚠️ Assignment is pending — please complete it before the deadline!</p>

        <a href="${process.env.APP_URL || 'http://localhost:3000'}/deadlines.html"
           style="display:inline-block;background:#6c63ff;color:#fff;padding:11px 26px;border-radius:6px;text-decoration:none;font-weight:600;font-size:.95rem;">
          View Deadlines →
        </a>
      </div>
      <div style="background:#f9f9f9;border-top:1px solid #eee;padding:14px 30px;font-size:.78rem;color:#aaa;text-align:center;">
        You received this because you have an upcoming deadline. — Student Academic Hub
      </div>
    </div>
  </div>`;
}

function startDeadlineReminder() {
  // Runs every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now          = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

      const deadlines = await Deadline.find({
        dueDate:      { $gt: now, $lte: oneHourLater },
        status:       { $ne: 'completed' },
        reminderSent: false
      }).populate('studentId', 'name email');

      if (!deadlines.length) return;

      console.log(`⏰ Deadline reminder: checking ${deadlines.length} due-soon deadline(s)`);

      for (const dl of deadlines) {
        const student = dl.studentId;
        if (!student || !student.email) continue;

        try {
          await mailer.sendMail({
            from:    process.env.EMAIL_FROM || 'AcademicHub <noreply@academichub.com>',
            to:      student.email,
            subject: `⏰ Reminder: "${dl.title}" is due in less than 1 hour`,
            html:    reminderEmailHtml(student.name, dl.title, dl.dueDate, dl.priority)
          });
          console.log(`  ✅ Reminder sent to ${student.email} for "${dl.title}"`);
        } catch (mailErr) {
          console.error(`  ❌ Failed to send reminder to ${student.email}:`, mailErr.message);
        }

        dl.reminderSent = true;
        await dl.save();
      }
    } catch (err) {
      console.error('Deadline reminder job error:', err.message);
    }
  });

  console.log('⏰ Deadline reminder job started (runs every 5 min)');
}

module.exports = startDeadlineReminder;
