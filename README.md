# Student Academic Hub

A full-stack academic management system for students.

## Tech Stack
- **Frontend**: HTML5, CSS3, Bootstrap 5, Vanilla JS
- **Backend**: Node.js + Express.js
- **Database**: MongoDB (Mongoose) + GridFS (file storage)
- **Auth**: JWT + bcrypt
- **File Upload**: Multer (memory storage) → MongoDB GridFS
- **Email**: Nodemailer (SMTP)
- **Scheduler**: node-cron (deadline reminders)

## Features
- Register / Login (JWT auth)
- Dashboard with stats overview
- Notes — Create, Edit, Delete, Search, Share, **File Attachments**
- Projects — CRUD with status tracking (Pending / In Progress / Completed), **File Attachments**
- Deadlines — Priority levels, overdue detection, mark complete, **File Attachments**, **1-hour email reminder**
- Groups — Create, Join via invite code, **Invitation system** (invite by email, accept/reject), Delete group (admin), Share notes/projects, **View & Download shared resources**, **Group File Uploads**
- File Upload — Attach files when creating or viewing any item; stored in MongoDB GridFS
- Supported file types: PDF, Word, Excel, PowerPoint, images (JPG/PNG/GIF/WEBP), TXT, CSV, ZIP (max 20 MB)

## Project Structure
```
student-academic-hub/
├── server/
│   ├── config/
│   │   ├── db.js                # MongoDB connection
│   │   ├── gridfs.js            # GridFSBucket init & getter
│   │   └── mailer.js            # Nodemailer SMTP transporter
│   ├── jobs/
│   │   └── deadlineReminder.js  # Cron job — 1-hour deadline email alerts
│   ├── middleware/
│   │   ├── auth.js              # JWT middleware (header + ?token= query param)
│   │   └── upload.js            # Multer memory storage + file filter
│   ├── models/
│   │   ├── Student.js
│   │   ├── Note.js              # includes attachments[]
│   │   ├── Project.js           # includes attachments[]
│   │   ├── Deadline.js          # includes attachments[], reminderSent flag
│   │   ├── Group.js
│   │   ├── GroupResource.js
│   │   ├── GroupFile.js         # group-level file uploads
│   │   ├── GroupInvitation.js   # group invitation (pending/accepted/rejected)
│   │   └── AttachmentSchema.js  # shared subdocument schema
│   ├── routes/
│   │   ├── auth.js
│   │   ├── notes.js
│   │   ├── projects.js
│   │   ├── deadlines.js
│   │   ├── groups.js
│   │   └── files.js             # GET /api/files/:fileId (stream from GridFS)
│   └── index.js                 # App entry point
├── public/
│   ├── css/style.css
│   ├── js/utils.js
│   ├── index.html               # Login
│   ├── register.html
│   ├── dashboard.html
│   ├── notes.html
│   ├── projects.html
│   ├── deadlines.html
│   └── groups.html
├── seed.js                      # Seeds DB with sample data + GridFS attachments
├── .env
└── package.json
```

## Setup & Run

### Prerequisites
- Node.js v18+
- MongoDB (local) OR MongoDB Atlas (cloud)

### Steps

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   Edit `.env`:
   ```
   PORT=3000
   MONGO_URI=mongodb://localhost:27017/student_academic_hub
   JWT_SECRET=your_secret_key_here

   # Email (SMTP) — required for deadline reminders
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   EMAIL_FROM=AcademicHub <noreply@academichub.com>
   APP_URL=http://localhost:3000
   ```
   > For testing emails without a real SMTP, use [Ethereal](https://ethereal.email) — run `node -e "require('nodemailer').createTestAccount().then(a=>console.log(a))"` to generate free credentials.

3. **Start MongoDB** (if running locally)
   - Mac: `brew services start mongodb-community`
   - Windows: Start from Services or `mongod`

4. **Seed sample data** (optional)
   ```bash
   node seed.js
   ```

5. **Run the server**
   ```bash
   # Development (auto-restart on changes)
   npm run dev

   # Production
   npm start
   ```

6. **Open in browser**
   ```
   http://localhost:3000
   ```

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register student |
| POST | /api/auth/login | Login |
| GET  | /api/auth/me | Get current user |

### Notes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | /api/notes | Get all notes |
| POST   | /api/notes | Create note |
| PUT    | /api/notes/:id | Update note |
| DELETE | /api/notes/:id | Delete note |
| PATCH  | /api/notes/:id/share | Toggle share |
| POST   | /api/notes/:id/attachments | Upload file to note |
| DELETE | /api/notes/:id/attachments/:fileId | Remove attachment |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | /api/projects | Get all projects |
| POST   | /api/projects | Create project |
| PUT    | /api/projects/:id | Update project |
| DELETE | /api/projects/:id | Delete project |
| PATCH  | /api/projects/:id/share | Toggle share |
| POST   | /api/projects/:id/attachments | Upload file to project |
| DELETE | /api/projects/:id/attachments/:fileId | Remove attachment |

### Deadlines
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | /api/deadlines | Get all deadlines |
| POST   | /api/deadlines | Create deadline |
| PUT    | /api/deadlines/:id | Update deadline |
| DELETE | /api/deadlines/:id | Delete deadline |
| PATCH  | /api/deadlines/:id/status | Update status |
| POST   | /api/deadlines/:id/attachments | Upload file to deadline |
| DELETE | /api/deadlines/:id/attachments/:fileId | Remove attachment |

### Groups
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | /api/groups | Get my groups |
| POST   | /api/groups | Create group |
| POST   | /api/groups/join | Join by invite code |
| GET    | /api/groups/invitations | My pending invitations |
| PATCH  | /api/groups/invitations/:id/respond | Accept or reject invitation |
| GET    | /api/groups/:id | Group details |
| GET    | /api/groups/:id/resources | Shared resources |
| POST   | /api/groups/:id/share | Share note/project to group |
| POST   | /api/groups/:id/invite | Invite student by email (admin only) |
| GET    | /api/groups/:id/invitations | List sent invitations (admin only) |
| DELETE | /api/groups/:id | Delete group (admin only) |
| DELETE | /api/groups/:id/leave | Leave group |
| POST   | /api/groups/:id/files | Upload file to group |
| GET    | /api/groups/:id/files | List group files |
| DELETE | /api/groups/:id/files/:fileId | Delete group file |

### Files
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | /api/files/:fileId | Stream / download file from GridFS |

> All file endpoints accept the JWT token via `Authorization: Bearer <token>` header **or** `?token=<token>` query param (required for direct browser links).

## File Upload Notes
- Files are stored directly in MongoDB using **GridFS** (`uploads.files` + `uploads.chunks` collections)
- No local disk storage or external cloud service required
- Max file size: **20 MB**
- Allowed types: PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, JPG, PNG, GIF, WEBP, TXT, CSV, ZIP
- PDFs and images open inline in the browser; all other types force download
- All file endpoints require a valid JWT token

## Deadline Email Reminders
- Cron job runs every **5 minutes**
- Sends an HTML reminder email when a deadline is due within **1 hour** and is not yet completed
- Each deadline triggers at most **one** reminder email (`reminderSent` flag prevents duplicates)
- Configure SMTP credentials in `.env` before use (see Setup above)

## Group Invitation Flow
1. Admin opens group → clicks **Invite Member** → enters invitee's email
2. Invitee sees a **Pending Invitations** banner on their Groups page
3. Invitee clicks **Accept** → automatically added as member
4. Invitee clicks **Reject** → admin sees `rejected` status in Sent Invitations list
5. Admin can re-invite after rejection

## Test Credentials (seed data)
```
alice@student.com / password123
bob@student.com   / password123
```
Run `node seed.js` to populate sample data including GridFS attachments.
