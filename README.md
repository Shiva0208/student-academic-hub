# Student Academic Hub

A full-stack academic management system for students.

## Tech Stack
- **Frontend**: HTML5, CSS3, Bootstrap 5, Vanilla JS
- **Backend**: Node.js + Express.js
- **Database**: MongoDB (Mongoose)
- **Auth**: JWT + bcrypt

## Features
- Register / Login (JWT auth)
- Dashboard with stats overview
- Notes — Create, Edit, Delete, Search, Share
- Projects — CRUD with status tracking (Pending / In Progress / Completed)
- Deadlines — Priority levels, overdue detection, mark complete
- Groups — Create, Join via invite code, share notes/projects to group

## Project Structure
```
student-academic-hub/
├── server/
│   ├── config/db.js          # MongoDB connection
│   ├── middleware/auth.js     # JWT middleware
│   ├── models/               # Mongoose models
│   │   ├── Student.js
│   │   ├── Note.js
│   │   ├── Project.js
│   │   ├── Deadline.js
│   │   ├── Group.js
│   │   └── GroupResource.js
│   ├── routes/               # Express REST routes
│   │   ├── auth.js
│   │   ├── notes.js
│   │   ├── projects.js
│   │   ├── deadlines.js
│   │   └── groups.js
│   └── index.js              # App entry point
├── public/                   # Static frontend
│   ├── css/style.css
│   ├── js/utils.js
│   ├── index.html            # Login
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

1. **Open the folder in VS Code**
   ```
   student-academic-hub/
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   Edit `.env`:
   ```
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/student_academic_hub
   JWT_SECRET=your_secret_key_here
   ```
   > For MongoDB Atlas, replace MONGO_URI with your Atlas connection string.

4. **Start MongoDB** (if running locally)
   - Make sure MongoDB service is running on your machine.
   - On Mac: `brew services start mongodb-community`
   - On Windows: Start from Services or `mongod`

5. **Run the server**
   ```bash
   # Development (auto-restart on changes)
   npm run dev

   # Production
   npm start
   ```

6. **Open in browser**
   ```
   http://localhost:5000
   ```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register student |
| POST | /api/auth/login | Login |
| GET  | /api/auth/me | Get current user |
| GET  | /api/notes | Get all notes |
| POST | /api/notes | Create note |
| PUT  | /api/notes/:id | Update note |
| DELETE | /api/notes/:id | Delete note |
| PATCH | /api/notes/:id/share | Toggle share |
| GET  | /api/projects | Get all projects |
| POST | /api/projects | Create project |
| PUT  | /api/projects/:id | Update project |
| DELETE | /api/projects/:id | Delete project |
| PATCH | /api/projects/:id/share | Toggle share |
| GET  | /api/deadlines | Get all deadlines |
| POST | /api/deadlines | Create deadline |
| PUT  | /api/deadlines/:id | Update deadline |
| DELETE | /api/deadlines/:id | Delete deadline |
| PATCH | /api/deadlines/:id/status | Update status |
| GET  | /api/groups | Get my groups |
| POST | /api/groups | Create group |
| POST | /api/groups/join | Join by invite code |
| GET  | /api/groups/:id | Group details |
| GET  | /api/groups/:id/resources | Shared resources |
| POST | /api/groups/:id/share | Share to group |
| DELETE | /api/groups/:id/leave | Leave group |
