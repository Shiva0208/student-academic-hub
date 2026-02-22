# Student Academic Hub — Project Flow

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Authentication Flow](#authentication-flow)
4. [Notes Flow](#notes-flow)
5. [Projects Flow](#projects-flow)
6. [Deadlines Flow](#deadlines-flow)
7. [Groups Flow](#groups-flow)
8. [File Upload Flow](#file-upload-flow)
9. [Database Schema](#database-schema)
10. [Frontend Architecture](#frontend-architecture)
11. [API Request Lifecycle](#api-request-lifecycle)

---

## Overview

Student Academic Hub is a single-page web application (SPA) that helps students manage their academic life. It runs on a single Node.js/Express server that serves both the REST API and the static frontend from the same port.

```
Browser  ──────►  Express Server (port 5000)
                      │
                      ├── /api/*        →  REST API (JSON)
                      ├── /api/files/*  →  File streaming (GridFS)
                      └── /*            →  Static HTML pages
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                     FRONTEND                        │
│  HTML + Bootstrap 5 + Vanilla JS                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │notes.html│ │projs.html│ │deadlines │  ...        │
│  └──────────┘ └──────────┘ └──────────┘            │
│         └────────── utils.js ──────────┘            │
│           api() · apiUpload() · toast()             │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP (fetch + JWT Bearer token)
┌──────────────────────▼──────────────────────────────┐
│                     BACKEND                         │
│  Express.js                                         │
│  ┌──────────────────────────────────────────────┐   │
│  │  Middleware                                  │   │
│  │  cors → express.json → static → auth (JWT)  │   │
│  └──────────────────────────────────────────────┘   │
│  ┌────────┐ ┌────────┐ ┌─────────┐ ┌──────────┐    │
│  │ /auth  │ │/notes  │ │/projects│ │/deadlines│    │
│  └────────┘ └────────┘ └─────────┘ └──────────┘    │
│  ┌────────┐ ┌────────────────────────────────────┐  │
│  │/groups │ │  /files/:fileId  (GridFS stream)   │  │
│  └────────┘ └────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │ Mongoose ODM
┌──────────────────────▼──────────────────────────────┐
│                    MONGODB                          │
│  Collections:                                       │
│  students · notes · projects · deadlines            │
│  groups · groupresources · groupfiles               │
│  uploads.files · uploads.chunks  (GridFS)           │
└─────────────────────────────────────────────────────┘
```

---

## Authentication Flow

### Registration
```
User fills register form
        │
        ▼
POST /api/auth/register
  { name, email, password }
        │
        ▼
  bcrypt.hash(password, 10)
        │
        ▼
  Student.create({ name, email, hashedPassword })
        │
        ▼
  jwt.sign({ id, name, email }) → token
        │
        ▼
  Response: { token, student }
        │
        ▼
  localStorage.setItem('token', token)
  localStorage.setItem('student', JSON.stringify(student))
        │
        ▼
  Redirect → dashboard.html
```

### Login
```
User fills login form
        │
        ▼
POST /api/auth/login  { email, password }
        │
        ▼
  Student.findOne({ email })
  bcrypt.compare(password, hash)
        │
     ┌──┴──┐
   match   no match
     │        │
     ▼        ▼
  jwt.sign  401 Unauthorized
     │
     ▼
  Response: { token, student }
  → stored in localStorage
  → Redirect to dashboard.html
```

### Protected Routes
```
Every API call (except /auth/*):
        │
        ▼
  auth middleware
  Extract "Authorization: Bearer <token>"
        │
        ▼
  jwt.verify(token, JWT_SECRET)
        │
     ┌──┴──┐
   valid   invalid / expired
     │        │
     ▼        ▼
  req.student = decoded   401 Unauthorized
  next()
```

### Session Persistence
- Token stored in `localStorage` — persists across page refreshes
- Every page calls `checkAuth()` on load — redirects to login if no token
- Token expires after **7 days** (configurable in JWT sign options)

---

## Notes Flow

### Create Note (with optional files)
```
User opens "Add Note" modal
  → fills title, subject, content
  → optionally selects files (multi-select)
        │
        ▼
saveNote()
  POST /api/notes  { title, subject, content }
        │
        ▼
  Note.create({ studentId, title, subject, content })
  Returns: note document with _id
        │
        ▼
  [if files selected]
  for each file:
    FormData { file: File }
    POST /api/notes/:id/attachments
    → multer memoryStorage → req.file.buffer
    → GridFSBucket.openUploadStream()
    → push attachment metadata to note.attachments[]
    → note.save()
        │
        ▼
  toast("Note added with N files!")
  Modal closes → loadNotes() refreshes grid
```

### View Note + Manage Attachments
```
User clicks note title or eye icon
        │
        ▼
viewNote(id)
  Opens #viewModal
  Renders: title, subject, updated time, content
  Renders: attachments list from note.attachments[]
        │
  ┌─────┴──────────────────────────┐
  │                                │
Upload new file               Delete attachment
  │                                │
  ▼                                ▼
noteFileInput onChange        deleteDlAttachment(fileId)
  FormData { file }           DELETE /api/notes/:id/attachments/:fileId
  POST /api/notes/:id/              │
       attachments            bucket.delete(fileId)  ← GridFS
  → attachment pushed         note.attachments.splice(idx,1)
  → renderNoteAttachments()   → note.save()
                              → renderNoteAttachments()
```

### Download / View File
```
User clicks filename link
        │
        ▼
GET /api/files/:fileId  (auth required)
        │
        ▼
  GridFSBucket.find({ _id: fileId })
        │
        ▼
  Check contentType:
    PDF / image  → Content-Disposition: inline   → opens in browser tab
    other        → Content-Disposition: attachment → triggers download
        │
        ▼
  GridFSBucket.openDownloadStream(fileId).pipe(res)
```

### Edit Note
```
User clicks edit icon (or "Edit Note" in view modal footer)
        │
        ▼
openEdit(note) / openEditFromView()
  Populates #noteModal fields
  Hides file picker section (attachments managed in view modal)
        │
        ▼
saveNote()
  PUT /api/notes/:id  { title, subject, content }
  Note.findOneAndUpdate({ _id, studentId }, $set body)
  → loadNotes()
```

### Search & Filter
```
User types in search box  →  oninput="renderNotes()"
  Client-side filter on allNotes[] array:
    matchQ   = title or content includes query
    matchSub = subject includes filter text
    matchF   = 'all' | 'shared'
  Re-renders grid instantly (no API call)
```

---

## Projects Flow

### Create Project (with optional files)
```
User opens "Add Project" modal
  → fills title, description, status, due date
  → optionally selects files
        │
        ▼
saveProject()
  POST /api/projects  { title, description, status, dueDate }
        │
        ▼
  Project.create({ studentId, ...body })
  [if files] → upload each to GridFS, push to project.attachments[]
        │
        ▼
  loadProjects() → renders cards
```

### View Project Modal
```
User clicks project title or eye icon
        │
        ▼
viewProject(id)
  Opens #projViewModal
  Renders: title, status badge, due date, description
  Renders: attachments panel
        │
        ▼
  Same upload / delete / download flow as Notes
```

### Status Lifecycle
```
pending  ──►  in_progress  ──►  completed
   └─────────────────────────────────┘
         (editable at any time via PUT)
```

### Share to Group
```
User clicks share icon on project card
        │
        ▼
toggleShare(id)
  PATCH /api/projects/:id/share
  Toggles project.isShared boolean
        │
        ▼
In Groups page → "Share to Group" modal:
  Select resource type: project
  Select this project by title
  POST /api/groups/:groupId/share
    { resourceType: 'project', resourceId }
  GroupResource.create(...)
```

---

## Deadlines Flow

### Create Deadline (with optional files)
```
User opens "Add Deadline" modal
  → fills title, description, due date+time, priority
  → optionally selects files
        │
        ▼
saveDeadline()
  POST /api/deadlines  { title, description, dueDate, priority }
        │
        ▼
  Deadline.create({ studentId, ...body, status: 'upcoming' })
  [if files] → upload each to GridFS, push to deadline.attachments[]
        │
        ▼
  loadDeadlines() → renders list sorted by dueDate ASC
```

### Deadline Status Logic (frontend display)
```
For each deadline on render:

  status === 'completed'   →  green check  "Completed"
  status === 'missed'      →  red cross    "Missed"
  status === 'upcoming':
    daysUntil < 0          →  red          "Overdue by Nd"
    daysUntil === 0        →  amber bell   "Due Today"
    daysUntil <= 3         →  amber bell   "Nd left"
    daysUntil > 3          →  muted        "Nd left"
```

### Mark Complete / Undo
```
User clicks ✓ button
        │
        ▼
markStatus(id, 'completed')
  PATCH /api/deadlines/:id/status  { status: 'completed' }
  Deadline.findOneAndUpdate → { status }
        │
        ▼
  Renders ↺ undo button
  User clicks ↺  →  markStatus(id, 'upcoming')
```

### View Deadline Modal
```
User clicks deadline row or eye icon
        │
        ▼
viewDeadline(id)
  Opens #dlViewModal
  Shows: priority tag, due date/time, status
  Renders: attachments panel (same upload/delete/download flow)
  Footer: Close | Edit Deadline
```

---

## Groups Flow

### Create Group (with optional files)
```
User opens "Create Group" modal
  → fills name, description
  → optionally selects files
        │
        ▼
createGroup()
  POST /api/groups  { name, description }
        │
        ▼
  Group.create({
    name, description,
    createdBy: studentId,
    inviteCode: random 6-char uppercase (e.g. "SCI001"),
    members: [{ studentId, role: 'admin' }]
  })
  [if files] → upload each to GridFS → GroupFile.create(...)
        │
        ▼
  loadGroups() → renders group cards
```

### Join Group
```
User opens "Join Group" modal
  → enters 6-character invite code
        │
        ▼
joinGroup()
  POST /api/groups/join  { inviteCode }
        │
        ▼
  Group.findOne({ inviteCode: code.toUpperCase() })
  Check: not already a member
  group.members.push({ studentId, role: 'member' })
  group.save()
```

### Group Detail Panel
```
User clicks a group card
        │
        ▼
openGroup(id)
  Shows detail panel (inline, not a modal)
        │
  ┌─────┴────────────────────────────┐
  │                                  │
LEFT COLUMN                    RIGHT COLUMN
Members list                   Shared Resources
  GET /api/groups/:id            GET /api/groups/:id/resources
  (populated members)            (notes + projects shared to group)
                                        │
Invite code display              Group Files section
Copy button                        GET /api/groups/:id/files
                                   (files uploaded directly to group)
```

### Share Note/Project to Group
```
User clicks "+ Share" button in group detail
        │
        ▼
Opens #shareModal
  Select type: note | project
  Dropdown loads items: GET /api/notes or /api/projects
        │
        ▼
shareResource()
  POST /api/groups/:id/share
    { resourceType, resourceId }
        │
        ▼
  Check: not already shared
  GroupResource.create({
    groupId, resourceType, resourceId, sharedBy
  })
  → loadResources() refreshes list
```

### Group File Upload
```
User clicks "Upload File" in Group Files section
        │
        ▼
uploadGroupFile()
  FormData { file }
  POST /api/groups/:id/files
        │
        ▼
  Membership check
  GridFSBucket.openUploadStream()
  GroupFile.create({
    groupId, fileId, filename, originalName,
    mimetype, size, uploadedBy
  })
  → loadGroupFiles() refreshes list
        │
        ▼
  All group members can see and download the file
  Only the uploader can delete it
```

---

## File Upload Flow

### End-to-End Upload Pipeline
```
Browser selects file
        │
        ▼
FormData.append('file', fileObject)
        │
        ▼
apiUpload('POST', '/endpoint', formData)
  fetch() with:
    Authorization: Bearer <token>
    NO Content-Type header  ← browser sets multipart boundary automatically
        │
        ▼
Express server receives multipart request
        │
        ▼
multer({ storage: memoryStorage() })
  fileFilter checks MIME type → reject if not in allowed list
  limits: { fileSize: 20MB }
  req.file.buffer = entire file in RAM
        │
        ▼
Route handler:
  1. Ownership/membership check (findOne with studentId)
  2. Generate unique filename: `{timestamp}-{originalname}`
  3. GridFSBucket.openUploadStream(filename, { contentType, metadata })
  4. stream.end(req.file.buffer)  →  file chunks stored in MongoDB
  5. fileId = stream.id  (auto-generated ObjectId)
  6. Push attachment metadata to document.attachments[]
  7. document.save()
        │
        ▼
Response: attachment object
  { fileId, filename, originalName, mimetype, size, uploadedAt }
```

### File Storage in MongoDB
```
MongoDB Collections after upload:

uploads.files  (one document per file)
  {
    _id: ObjectId,         ← this is the fileId
    filename: "...",
    contentType: "...",
    length: 1234,
    chunkSize: 261120,
    uploadDate: ISODate,
    metadata: { entityType, entityId, ownerId }
  }

uploads.chunks  (file split into 255KB chunks)
  {
    _id: ObjectId,
    files_id: ObjectId,   ← references uploads.files._id
    n: 0,                 ← chunk sequence number
    data: BinData         ← actual file bytes
  }
```

### File Download Pipeline
```
User clicks filename  →  href="/api/files/:fileId"
        │
        ▼
GET /api/files/:fileId  (auth middleware runs first)
        │
        ▼
  new mongoose.Types.ObjectId(fileId)
  GridFSBucket.find({ _id: fileId }).toArray()
        │
     ┌──┴──┐
  found   not found
     │        │
     ▼        ▼
  Set headers:      404 { error: "File not found." }
  Content-Type: file.contentType
  Content-Disposition:
    PDF/image → inline   (opens in browser)
    other     → attachment; filename="..."
  Content-Length: file.length
        │
        ▼
  GridFSBucket.openDownloadStream(fileId).pipe(res)
  File bytes stream directly to browser
```

### File Deletion Pipeline
```
User clicks × on attachment
        │
        ▼
deleteNoteAttachment(fileId)  /  deleteProjAttachment  /  deleteDlAttachment
        │
        ▼
DELETE /api/:entity/:id/attachments/:fileId
        │
        ▼
  1. Find document, check ownership
  2. Find attachment index by fileId
  3. GridFSBucket.delete(fileObjId)  → removes from uploads.files + uploads.chunks
  4. document.attachments.splice(idx, 1)
  5. document.save()
        │
        ▼
  Response: { message: "Attachment deleted." }
  → UI re-renders attachment list
```

---

## Database Schema

```
Student
  _id, name, email, password(hashed), createdAt

Note
  _id, studentId*, title, content, subject,
  isShared, attachments[], createdAt, updatedAt

Project
  _id, studentId*, title, description, status,
  dueDate, isShared, attachments[], createdAt, updatedAt

Deadline
  _id, studentId*, title, description, dueDate,
  priority, status, attachments[], createdAt

Group
  _id, name, description, createdBy*, inviteCode,
  members[{ studentId*, role, joinedAt }], createdAt

GroupResource
  _id, groupId*, resourceType(note|project),
  resourceId*, sharedBy*, sharedAt

GroupFile
  _id, groupId*, fileId(GridFS ObjectId),
  filename, originalName, mimetype, size,
  uploadedBy*, uploadedAt

AttachmentSchema (embedded subdocument in Note/Project/Deadline)
  fileId(GridFS ObjectId), filename, originalName,
  mimetype, size, uploadedAt

  * = ObjectId reference to another collection
```

---

## Frontend Architecture

### Page Load Sequence
```
Page loads (e.g. notes.html)
        │
        ▼
<script src="js/utils.js">
  Defines: api(), apiUpload(), toast(), checkAuth(),
           fmtDate(), fmtSize(), fileIcon(), statusBadge() ...
        │
        ▼
<script> (inline, page-specific)
  checkAuth()  →  redirects to index.html if no token
  initNav('notes')  →  highlights active nav item
  loadNotes()  →  GET /api/notes  →  allNotes[] = data
                →  renderNotes()  →  builds DOM cards
```

### Shared Frontend Helpers (`utils.js`)
```
api(method, endpoint, body)
  → fetch with Content-Type: application/json + Bearer token
  → returns parsed JSON or throws Error

apiUpload(method, endpoint, formData)
  → fetch with NO Content-Type + Bearer token
  → used for multipart/form-data file uploads

toast(msg, type)
  → creates floating notification (success/error/warning/info)
  → auto-dismisses after 3 seconds

checkAuth()
  → reads token from localStorage
  → redirects to index.html if missing

fileIcon(mimetype)     → Font Awesome icon name for file type
fmtSize(bytes)         → "1.2 MB" / "340 KB"
fmtDate(date)          → "Feb 22, 2026"
fmtDateTime(date)      → "Feb 22, 2026, 09:00 AM"
daysUntil(date)        → integer days from now
statusBadge(status)    → HTML span with colour-coded badge
priorityTag(priority)  → HTML span for low/medium/high
avatar(name)           → initials string e.g. "AJ"
esc(str)               → HTML-escape to prevent XSS
```

### Modal Patterns

**Add/Create Modal** (notes, projects, deadlines, groups)
```
openAdd()      → clears all fields, shows file picker
saveEntity()   → POST → upload files → close modal → reload
```

**Edit Modal** (notes, projects, deadlines)
```
openEdit(obj)  → pre-fills fields, HIDES file picker
saveEntity()   → PUT → close modal → reload
```

**View Modal** (notes, projects, deadlines)
```
viewEntity(id) → shows read-only details + attachments panel
                 Upload button  → POST attachment
                 File list      → click = download, × = delete
                 "Edit" button  → closes view, opens edit modal
```

---

## API Request Lifecycle

```
Browser                   Express                    MongoDB
   │                         │                          │
   │── fetch(url, opts) ────►│                          │
   │                         │── auth middleware        │
   │                         │   verify JWT token       │
   │                         │── route handler          │
   │                         │   Model.find/create/...─►│
   │                         │                          │── query
   │                         │                          │◄─ result
   │                         │◄─ document(s) ───────────│
   │◄─ JSON response ────────│                          │
   │                         │                          │
   │  (file upload)          │                          │
   │── FormData ────────────►│                          │
   │                         │── multer middleware      │
   │                         │   req.file.buffer        │
   │                         │── GridFSBucket           │
   │                         │   .openUploadStream() ──►│── uploads.chunks
   │                         │   stream.end(buffer)     │── uploads.files
   │                         │── Model.attachments      │
   │                         │   .push(metadata) ──────►│── note/project/deadline
   │◄─ attachment JSON ──────│                          │
   │                         │                          │
   │  (file download)        │                          │
   │── GET /api/files/:id ──►│                          │
   │                         │── GridFSBucket           │
   │                         │   .openDownloadStream ──►│── reads chunks
   │◄══ byte stream ═════════│◄═════════════════════════│
```
