/* =============================================
   utils.js — Shared helpers for all pages
============================================= */

const API = '/api';

function getToken()   { return localStorage.getItem('token'); }
function getStudent() { const s = localStorage.getItem('student'); return s ? JSON.parse(s) : null; }

function checkAuth() {
  if (!getToken()) { window.location.href = 'index.html'; return false; }
  return true;
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('student');
  window.location.href = 'index.html';
}

// ---- API helper ----
async function api(method, endpoint, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  let res;
  try {
    res = await fetch(`${API}${endpoint}`, opts);
  } catch (err) {
    throw new Error('Server is not running. Run: npm run dev');
  }

  const text = await res.text();
  if (!text) throw new Error('Server returned empty response. Run: npm run dev');

  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error('Server error. Check terminal for errors.');
  }

  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ---- Toast ----
function toast(msg, type = 'success') {
  let box = document.getElementById('toastBox');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toastBox';
    box.className = 'toast-box';
    document.body.appendChild(box);
  }
  const colors = { success: '#00b894', error: '#d63031', warning: '#fdcb6e', info: '#74b9ff' };
  const icons  = { success: 'check-circle', error: 'times-circle', warning: 'exclamation-triangle', info: 'info-circle' };
  const t = document.createElement('div');
  t.className = 'toast-msg';
  t.style.borderLeft = `4px solid ${colors[type] || colors.success}`;
  t.innerHTML = `<i class="fas fa-${icons[type]} me-2" style="color:${colors[type]}"></i>${msg}`;
  box.appendChild(t);
  setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ---- Date helpers ----
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function daysUntil(d) { return Math.ceil((new Date(d) - new Date()) / 86400000); }
function isOverdue(d) { return new Date(d) < new Date(); }
function timeAgo(d) {
  const diff = (new Date() - new Date(d)) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

// ---- Navbar ----
function initNav(activePage) {
  const student = getStudent();
  const nameEl  = document.getElementById('studentName');
  if (nameEl && student) nameEl.textContent = student.name;

  document.querySelectorAll('.nav-link[data-page]').forEach(l => {
    if (l.dataset.page === activePage) l.classList.add('active');
  });
}

// ---- Confirm dialog ----
function confirm2(msg) { return window.confirm(msg); }

// ---- Escape HTML ----
function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// ---- Status badge HTML ----
function statusBadge(status) {
  const map = {
    pending:     '<span class="status-badge status-pending">Pending</span>',
    in_progress: '<span class="status-badge status-in_progress">In Progress</span>',
    completed:   '<span class="status-badge status-completed">Completed</span>'
  };
  return map[status] || status;
}

// ---- Priority tag HTML ----
function priorityTag(p) {
  return `<span class="priority-tag ${p}">${p.charAt(0).toUpperCase()+p.slice(1)}</span>`;
}

// ---- Initials avatar ----
function avatar(name) {
  const parts = (name || '?').split(' ');
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

// ---- File upload API helper (no Content-Type header — browser sets multipart boundary) ----
async function apiUpload(method, endpoint, formData) {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API}${endpoint}`, { method, headers, body: formData });
  } catch (err) {
    throw new Error('Server is not running. Run: npm run dev');
  }

  const text = await res.text();
  if (!text) throw new Error('Server returned empty response.');
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('Server error. Check terminal.'); }
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

// ---- Format file size ----
function fmtSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024)     return bytes + ' B';
  if (bytes < 1048576)  return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

// ---- File icon (Font Awesome name) ----
function fileIcon(mimetype) {
  if (!mimetype)                                               return 'file';
  if (mimetype.startsWith('image/'))                          return 'file-image';
  if (mimetype === 'application/pdf')                         return 'file-pdf';
  if (mimetype.includes('word'))                              return 'file-word';
  if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return 'file-excel';
  if (mimetype.includes('powerpoint') || mimetype.includes('presentation')) return 'file-powerpoint';
  if (mimetype.startsWith('text/'))                           return 'file-alt';
  if (mimetype === 'application/zip')                         return 'file-archive';
  return 'file';
}
