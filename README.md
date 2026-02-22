# Student Academic Hub

A full-stack academic management system for students.

## Tech Stack
- **Frontend**: HTML5, CSS3, Bootstrap 5, Vanilla JS
- **Backend**: Node.js + Express.js
- **Database**: MongoDB (Mongoose) + GridFS (file storage)
- **Auth**: JWT + bcrypt
- **File Upload**: Multer (memory storage) → MongoDB GridFS

## Features
- Register / Login (JWT auth)
- Dashboard with stats overview
- Notes — Create, Edit, Delete, Search, Share, **File Attachments**
- Projects — CRUD with status tracking (Pending / In Progress / Completed), **File Attachments**
- Deadlines — Priority levels, overdue detection, mark complete, **File Attachments**
- Groups — Create, Join via invite code, share notes/projects, **Group File Uploads**
- File Upload — Attach files when creating or viewing any item; stored in MongoDB GridFS
- Supported file types: PDF, Word, Excel, PowerPoint, images (JPG/PNG/GIF/WEBP), TXT, CSV, ZIP (max 20 MB)

## Project Structure
```
student-academic-hub/
├── server/
│   ├── config/
│   │   ├── db.js              # MongoDB connection
│   │   └── gridfs.js          # GridFSBucket init & getter
│   ├── middleware/
│   │   ├── auth.js            # JWT middleware
│   │   └── upload.js          # Multer memory storage + file filter
│   ├── models/
│   │   ├── Student.js
│   │   ├── Note.js            # includes attachments[]
│   │   ├── Project.js         # includes attachments[]
│   │   ├── Deadline.js        # includes attachments[]
│   │   ├── Group.js
│   │   ├── GroupResource.js
│   │   ├── GroupFile.js       # group-level file uploads
│   │   └── AttachmentSchema.js  # shared subdocument schema
│   ├── routes/
│   │   ├── auth.js
│   │   ├── notes.js
│   │   ├── projects.js
│   │   ├── deadlines.js
│   │   ├── groups.js
│   │   └── files.js           # GET /api/files/:fileId (stream from GridFS)
│   └── index.js               # App entry point
├── public/
│   ├── css/style.css
│   ├── js/utils.js
│   ├── index.html             # Login
│   ├── register.html
│   ├── dashboard.html
│   ├── notes.html
│   ├── projects.html
│   ├── deadlines.html
│   └── groups.html
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
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/student_academic_hub
   JWT_SECRET=your_secret_key_here
   ```
   > For MongoDB Atlas, replace MONGO_URI with your Atlas connection string.

3. **Start MongoDB** (if running locally)
   - Mac: `brew services start mongodb-community`
   - Windows: Start from Services or `mongod`

4. **Run the server**
   ```bash
   # Development (auto-restart on changes)
   npm run dev

   # Production
   npm start
   ```

5. **Open in browser**
   ```
   http://localhost:5000
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
| GET    | /api/groups/:id | Group details |
| GET    | /api/groups/:id/resources | Shared resources |
| POST   | /api/groups/:id/share | Share note/project to group |
| DELETE | /api/groups/:id/leave | Leave group |
| POST   | /api/groups/:id/files | Upload file to group |
| GET    | /api/groups/:id/files | List group files |
| DELETE | /api/groups/:id/files/:fileId | Delete group file |

### Files
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | /api/files/:fileId | Stream / download file from GridFS |

## File Upload Notes
- Files are stored directly in MongoDB using **GridFS** (`uploads.files` + `uploads.chunks` collections)
- No local disk storage or external cloud service required
- Max file size: **20 MB**
- Allowed types: PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, JPG, PNG, GIF, WEBP, TXT, CSV, ZIP
- PDFs and images open inline in the browser; all other types download
- All file endpoints require a valid JWT token

## Test Credentials (seed data)
```
alice@student.com / password123
bob@student.com   / password123
```
Run `node seed.js` to populate sample data.
