const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');
require('dotenv').config();

const config = require('./config');

const root = config.root;
const port = config.port;
fs.mkdirSync(path.dirname(config.database.path), { recursive: true });
fs.mkdirSync(config.upload.dir, { recursive: true });

const db = new DatabaseSync(config.database.path);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
db.exec('PRAGMA busy_timeout = 5000;');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    department TEXT NOT NULL,
    year TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    department TEXT NOT NULL,
    year TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    uploaded_by TEXT,
    uploaded_by_name TEXT NOT NULL,
    stored_name TEXT,
    original_name TEXT,
    downloads INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS bookmarks (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, material_id)
  );
  CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS password_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    color TEXT DEFAULT '#6c757d',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS material_tags (
    material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (material_id, tag_id)
  );
  CREATE VIRTUAL TABLE IF NOT EXISTS materials_fts USING fts5(title, description, subject, department, year);
  CREATE TRIGGER IF NOT EXISTS materials_ai AFTER INSERT ON materials BEGIN
    INSERT INTO materials_fts(rowid, title, description, subject, department, year) VALUES (new.id, new.title, new.description, new.subject, new.department, new.year);
  END;
  CREATE TRIGGER IF NOT EXISTS materials_ad AFTER DELETE ON materials BEGIN
    DELETE FROM materials_fts WHERE rowid = old.id;
  END;
  CREATE TRIGGER IF NOT EXISTS materials_au AFTER UPDATE ON materials BEGIN
    DELETE FROM materials_fts WHERE rowid = old.id;
    INSERT INTO materials_fts(rowid, title, description, subject, department, year) VALUES (new.id, new.title, new.description, new.subject, new.department, new.year);
  END;
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    ip TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);
try { db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'"); } catch (error) { if (!String(error.message).includes('duplicate column')) throw error; }
db.exec('CREATE TABLE IF NOT EXISTS sessions (sid TEXT PRIMARY KEY, sess TEXT NOT NULL, expire INTEGER NOT NULL)');

class SQLiteSessionStore extends session.Store {
  get(sid, callback) {
    try { const row = db.prepare('SELECT sess, expire FROM sessions WHERE sid = ?').get(sid); if (!row || row.expire <= Date.now()) return callback(null, null); callback(null, JSON.parse(row.sess)); } catch (error) { callback(error); }
  }
  set(sid, sess, callback) {
    try { db.prepare('INSERT INTO sessions (sid, sess, expire) VALUES (?, ?, ?) ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expire = excluded.expire').run(sid, JSON.stringify(sess), sess.cookie?.expires ? new Date(sess.cookie.expires).getTime() : Date.now() + 28_800_000); callback?.(null); } catch (error) { callback?.(error); }
  }
  destroy(sid, callback) { try { db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid); callback?.(null); } catch (error) { callback?.(error); } }
  touch(sid, sess, callback) { this.set(sid, sess, callback); }
}

const seedMaterials = [
  ['Algorithms & Complexity Notes', 'Data Structures', 'Computer Science', '2nd Year', 'PDF', 'A focused guide to asymptotic analysis, sorting, searching, and graph algorithms.', 'Maya Patel', 128],
  ['SQL Query Patterns', 'Database Management Systems', 'Computer Science', '2nd Year', 'DOCX', 'Practical examples for joins, aggregation, subqueries, and database normalization.', 'Aiden Brooks', 96],
  ['Network Layers Cheat Sheet', 'Computer Networks', 'Information Technology', '3rd Year', 'PDF', 'A compact visual reference for OSI, TCP/IP, routing, and common protocols.', 'Noah Williams', 84],
  ['Python for Data Analysis', 'Python', 'Computer Science', '1st Year', 'PDF', 'Exercises and patterns for working with Python collections, pandas, and visualizations.', 'Iris Chen', 151],
  ['Operating Systems Review', 'Operating Systems', 'Computer Engineering', '3rd Year', 'PPTX', 'Revision slides covering processes, scheduling, memory, and file systems.', 'Leo Martin', 67],
  ['Responsive Web Design Lab', 'Web Development', 'Computer Science', '2nd Year', 'ZIP', 'A hands-on lab pack for accessible layouts, responsive CSS, and modern UI patterns.', 'Sofia Rivera', 73],
  ['Machine Learning Foundations', 'Machine Learning', 'AI & DS', '4th Year', 'PDF', 'Linear models, evaluation metrics, and the intuition behind supervised learning.', 'Ethan Cole', 112],
  ['Java OOP Patterns', 'Java', 'Computer Engineering', '2nd Year', 'PDF', 'Clear examples of encapsulation, inheritance, interfaces, and common design patterns.', 'Nora Singh', 54]
];
const defaultSubjects = ['Data Structures', 'Database Management Systems', 'Computer Networks', 'Python', 'Operating Systems', 'Web Development', 'Machine Learning', 'Java'];
const defaultDepartments = ['Computer Science', 'Information Technology', 'Computer Engineering', 'AI & DS'];
if (db.prepare('SELECT COUNT(*) AS count FROM materials').get().count === 0) {
  const insert = db.prepare('INSERT INTO materials (title, subject, department, year, type, description, uploaded_by_name, downloads) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  seedMaterials.forEach((material) => insert.run(...material));
}
if (db.prepare('SELECT COUNT(*) AS count FROM materials_fts').get().count === 0) {
  const materials = db.prepare('SELECT id, title, description, subject, department, year FROM materials').all();
  const ftsInsert = db.prepare('INSERT INTO materials_fts(rowid, title, description, subject, department, year) VALUES (?, ?, ?, ?, ?, ?)');
  for (const m of materials) {
    ftsInsert.run(m.id, m.title, m.description, m.subject, m.department, m.year);
  }
}
const seedOption = db.prepare('INSERT OR IGNORE INTO subjects (name) VALUES (?)');
defaultSubjects.forEach((name) => seedOption.run(name));
const seedDepartment = db.prepare('INSERT OR IGNORE INTO departments (name) VALUES (?)');
defaultDepartments.forEach((name) => seedDepartment.run(name));
const adminEmail = config.auth.adminEmail;
if (!db.prepare('SELECT 1 FROM users WHERE email = ?').get(adminEmail)) {
  if (!config.auth.adminPassword) throw new Error('ADMIN_PASSWORD must be set in environment');
  db.prepare('INSERT INTO users (id, name, email, password_hash, department, year, role) VALUES (?, ?, ?, ?, ?, ?, ?)').run(crypto.randomUUID(), config.branding.appName + ' Admin', adminEmail, bcrypt.hashSync(config.auth.adminPassword, config.auth.bcryptRounds), config.branding.defaultDepartment, config.branding.defaultYear, 'admin');
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', config.security.trustProxy);
app.use(helmet(config.security.helmet));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use('/api', (req, res, next) => {
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method) && req.headers.origin && req.headers.origin !== `${req.protocol}://${req.get('host')}`) return res.status(403).json({ error: 'Cross-origin request rejected.' });
  next();
});
app.use(session({
  store: new SQLiteSessionStore(),
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: config.session.cookie,
}));
app.use('/api/auth', rateLimit({ windowMs: config.auth.rateLimit.windowMs, limit: config.auth.rateLimit.max, standardHeaders: true, legacyHeaders: false }));
app.use(rateLimit({ windowMs: config.auth.globalRateLimit.windowMs, limit: config.auth.globalRateLimit.max, standardHeaders: true, legacyHeaders: false }));
app.use(express.static(path.join(root, 'pro'), { extensions: ['html'] }));

const csrfProtection = csrf({ cookie: { httpOnly: true, sameSite: 'lax', secure: config.session.cookie.secure, key: config.security.csrfCookieName } });
app.use((req, res, next) => {
  if (config.security.csrfEnabled && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method) && !req.path.startsWith('/api/')) {
    return csrfProtection(req, res, next);
  }
  next();
});
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken?.();
  next();
});

const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email, department: user.department, year: user.year, role: user.role || 'user' });
const materialView = (row, userId) => {
  const tags = userId ? db.prepare('SELECT t.id, t.name, t.color FROM tags t JOIN material_tags mt ON mt.tag_id = t.id WHERE mt.material_id = ? ORDER BY t.name').all(row.id) : [];
  return {
    id: row.id, title: row.title, subject: row.subject, department: row.department, year: row.year, type: row.type,
    description: row.description, uploadedBy: row.uploaded_by_name, date: new Date(`${row.created_at}Z`).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    downloads: row.downloads, bookmarked: Boolean(userId && db.prepare('SELECT 1 FROM bookmarks WHERE user_id = ? AND material_id = ?').get(userId, row.id)), owner: row.uploaded_by === userId, tags
  };
};
const requireAuth = (req, res, next) => {
  const user = req.session.user && db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  req.user = user;
  next();
};
const requireAdmin = (req, res, next) => requireAuth(req, res, () => req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Administrator access required.' }));
const getMaterial = (id) => db.prepare('SELECT * FROM materials WHERE id = ?').get(Number(id));
const auditLog = (userId, action, targetType, targetId, req) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const ua = req.headers['user-agent'] || 'unknown';
  db.prepare('INSERT INTO audit_logs (user_id, action, target_type, target_id, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?)').run(userId, action, targetType, targetId, ip, ua);
};

app.get('/api/auth/me', (req, res) => res.json({ user: req.session.user ? publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id)) : null }));
app.get('/api/options', (_req, res) => res.json({ subjects: db.prepare('SELECT id, name FROM subjects ORDER BY name').all(), departments: db.prepare('SELECT id, name FROM departments ORDER BY name').all() }));
app.post('/api/auth/register', async (req, res, next) => {
  try {
    const { name, email, password, department, year } = req.body;
    const v = config.validation;
    const validYears = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
    if (!name?.trim() || name.length > v.nameMaxLength || !/^\S+@\S+\.\S+$/.test(email || '') || !password || password.length < config.auth.passwordMinLength || !department || !year) return res.status(400).json({ error: 'Please provide valid registration details.' });
    const departments = db.prepare('SELECT name FROM departments').all().map((d) => d.name);
    if (!departments.includes(department) || !validYears.includes(year)) return res.status(400).json({ error: 'Invalid department or year.' });
    const user = { id: crypto.randomUUID(), name: name.trim(), email: email.trim().toLowerCase(), department, year };
    const hash = await bcrypt.hash(password, config.auth.bcryptRounds);
    db.prepare('INSERT INTO users (id, name, email, password_hash, department, year) VALUES (?, ?, ?, ?, ?, ?)').run(user.id, user.name, user.email, hash, user.department, user.year);
    db.prepare('INSERT INTO password_history (user_id, password_hash) VALUES (?, ?)').run(user.id, hash);
    req.session.user = { id: user.id };
    auditLog(user.id, 'USER_REGISTER', 'user', user.id, req);
    res.status(201).json({ user });
  } catch (error) { if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'An account with this email already exists.' }); next(error); }
});
app.post('/api/auth/login', async (req, res, next) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(req.body.email || '').trim().toLowerCase());
    if (!user || !(await bcrypt.compare(String(req.body.password || ''), user.password_hash))) return res.status(401).json({ error: 'Incorrect email or password.' });
    req.session.user = { id: user.id };
    auditLog(user.id, 'USER_LOGIN', 'user', user.id, req);
    res.json({ user: publicUser(user) });
  } catch (error) { next(error); }
});
app.post('/api/auth/logout', (req, res, next) => req.session.destroy((error) => error ? next(error) : res.clearCookie('connect.sid').status(204).end()));

app.post('/api/auth/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Valid email required.' });
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
    if (!user) return res.json({ message: 'If the email exists, a reset link will be sent.' });
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(token, 12);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)').run(user.id, tokenHash, expiresAt);
    console.log(`[DEV] Password reset token for ${user.email}: ${token}`);
    res.json({ message: 'If the email exists, a reset link will be sent.' });
  } catch (error) { next(error); }
});
app.post('/api/auth/reset-password', async (req, res, next) => {
  try {
    const { token, password, confirmPassword } = req.body;
    if (!token || !password || password !== confirmPassword || password.length < config.auth.passwordMinLength) return res.status(400).json({ error: 'Invalid or mismatched passwords.' });
    const tokens = db.prepare('SELECT * FROM password_reset_tokens WHERE used = 0 AND expires_at > ?').all(new Date().toISOString());
    let validToken = null;
    for (const t of tokens) {
      if (await bcrypt.compare(token, t.token_hash)) { validToken = t; break; }
    }
    if (!validToken) return res.status(400).json({ error: 'Invalid or expired reset token.' });
    const newHash = await bcrypt.hash(password, config.auth.bcryptRounds);
    const history = db.prepare('SELECT password_hash FROM password_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(validToken.user_id, config.auth.passwordHistoryCount);
    if (history.some((h) => bcrypt.compareSync(password, h.password_hash))) return res.status(400).json({ error: 'Password recently used. Choose a different one.' });
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, validToken.user_id);
    db.prepare('INSERT INTO password_history (user_id, password_hash) VALUES (?, ?)').run(validToken.user_id, newHash);
    db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(validToken.id);
    res.json({ message: 'Password reset successful.' });
  } catch (error) { next(error); }
});

app.get('/api/materials', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(config.pagination.maxLimit, Math.max(1, parseInt(req.query.limit || config.pagination.defaultLimit, 10)));
  const offset = (page - 1) * limit;
  const search = req.query.search?.trim();
  let rows, total;
  if (search) {
    const ftsRows = db.prepare('SELECT rowid FROM materials_fts WHERE materials_fts MATCH ? ORDER BY rank LIMIT ? OFFSET ?').all(search, limit, offset);
    const ids = ftsRows.map((r) => r.rowid);
    if (ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      rows = db.prepare(`SELECT * FROM materials WHERE id IN (${placeholders}) ORDER BY id DESC`).all(...ids);
      total = db.prepare('SELECT COUNT(*) AS count FROM materials_fts WHERE materials_fts MATCH ?').get(search).count;
    } else {
      rows = [];
      total = 0;
    }
  } else {
    rows = db.prepare('SELECT * FROM materials ORDER BY id DESC LIMIT ? OFFSET ?').all(limit, offset);
    total = db.prepare('SELECT COUNT(*) AS count FROM materials').get().count;
  }
  res.json({ materials: rows.map((row) => materialView(row, req.session.user?.id)), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});
app.get('/api/admin/subjects', requireAdmin, (_req, res) => res.json({ subjects: db.prepare('SELECT id, name FROM subjects ORDER BY name').all() }));
app.post('/api/admin/subjects', requireAdmin, (req, res) => { const name = String(req.body.name || '').trim(); if (!name || name.length > 80) return res.status(400).json({ error: 'Subject name is required and must be under 80 characters.' }); try { const result = db.prepare('INSERT INTO subjects (name) VALUES (?)').run(name); res.status(201).json({ subject: { id: result.lastInsertRowid, name } }); } catch (error) { if (String(error.message).includes('UNIQUE')) return res.status(409).json({ error: 'Subject already exists.' }); throw error; } });
app.patch('/api/admin/subjects/:id', requireAdmin, (req, res) => { const name = String(req.body.name || '').trim(); if (!name || name.length > 80) return res.status(400).json({ error: 'Valid subject name is required.' }); try { const result = db.prepare('UPDATE subjects SET name = ? WHERE id = ?').run(name, Number(req.params.id)); if (!result.changes) return res.status(404).json({ error: 'Subject not found.' }); res.json({ subject: { id: Number(req.params.id), name } }); } catch (error) { if (String(error.message).includes('UNIQUE')) return res.status(409).json({ error: 'Subject already exists.' }); throw error; } });
app.delete('/api/admin/subjects/:id', requireAdmin, (req, res) => { const result = db.prepare('DELETE FROM subjects WHERE id = ?').run(Number(req.params.id)); if (!result.changes) return res.status(404).json({ error: 'Subject not found.' }); res.status(204).end(); });
app.get('/api/admin/departments', requireAdmin, (_req, res) => res.json({ departments: db.prepare('SELECT id, name FROM departments ORDER BY name').all() }));
app.post('/api/admin/departments', requireAdmin, (req, res) => { const name = String(req.body.name || '').trim(); if (!name || name.length > 100) return res.status(400).json({ error: 'Department name is required and must be under 100 characters.' }); try { const result = db.prepare('INSERT INTO departments (name) VALUES (?)').run(name); res.status(201).json({ department: { id: result.lastInsertRowid, name } }); } catch (error) { if (String(error.message).includes('UNIQUE')) return res.status(409).json({ error: 'Department already exists.' }); throw error; } });
app.patch('/api/admin/departments/:id', requireAdmin, (req, res) => { const name = String(req.body.name || '').trim(); if (!name || name.length > 100) return res.status(400).json({ error: 'Valid department name is required.' }); try { const result = db.prepare('UPDATE departments SET name = ? WHERE id = ?').run(name, Number(req.params.id)); if (!result.changes) return res.status(404).json({ error: 'Department not found.' }); res.json({ department: { id: Number(req.params.id), name } }); } catch (error) { if (String(error.message).includes('UNIQUE')) return res.status(409).json({ error: 'Department already exists.' }); throw error; } });
app.delete('/api/admin/departments/:id', requireAdmin, (req, res) => { const result = db.prepare('DELETE FROM departments WHERE id = ?').run(Number(req.params.id)); if (!result.changes) return res.status(404).json({ error: 'Department not found.' }); res.status(204).end(); });

app.get('/api/tags', (_req, res) => res.json({ tags: db.prepare('SELECT id, name, color FROM tags ORDER BY name').all() }));
app.post('/api/tags', requireAdmin, (req, res) => { const name = String(req.body.name || '').trim(); const color = String(req.body.color || '#6c757d').trim(); if (!name || name.length > 50) return res.status(400).json({ error: 'Tag name is required and must be under 50 characters.' }); if (!/^#[0-9a-fA-F]{6}$/.test(color)) return res.status(400).json({ error: 'Color must be a valid hex color (e.g., #6c757d).' }); try { const result = db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)').run(name, color); res.status(201).json({ tag: { id: result.lastInsertRowid, name, color } }); } catch (error) { if (String(error.message).includes('UNIQUE')) return res.status(409).json({ error: 'Tag already exists.' }); throw error; } });
app.patch('/api/tags/:id', requireAdmin, (req, res) => { const name = String(req.body.name || '').trim(); const color = String(req.body.color || '#6c757d').trim(); if (!name || name.length > 50) return res.status(400).json({ error: 'Valid tag name is required.' }); if (!/^#[0-9a-fA-F]{6}$/.test(color)) return res.status(400).json({ error: 'Color must be a valid hex color (e.g., #6c757d).' }); try { const result = db.prepare('UPDATE tags SET name = ?, color = ? WHERE id = ?').run(name, color, Number(req.params.id)); if (!result.changes) return res.status(404).json({ error: 'Tag not found.' }); res.json({ tag: { id: Number(req.params.id), name, color } }); } catch (error) { if (String(error.message).includes('UNIQUE')) return res.status(409).json({ error: 'Tag already exists.' }); throw error; } });
app.delete('/api/tags/:id', requireAdmin, (req, res) => { const result = db.prepare('DELETE FROM tags WHERE id = ?').run(Number(req.params.id)); if (!result.changes) return res.status(404).json({ error: 'Tag not found.' }); res.status(204).end(); });

app.get('/api/materials/:id/tags', (req, res) => { const row = getMaterial(req.params.id); if (!row) return res.status(404).json({ error: 'Material not found.' }); const tags = db.prepare('SELECT t.id, t.name, t.color FROM tags t JOIN material_tags mt ON mt.tag_id = t.id WHERE mt.material_id = ? ORDER BY t.name').all(Number(req.params.id)); res.json({ tags }); });
app.post('/api/materials/:id/tags', requireAuth, (req, res) => { const row = getMaterial(req.params.id); if (!row) return res.status(404).json({ error: 'Material not found.' }); if (row.uploaded_by !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Only the uploader or admin can modify tags.' }); const tagIds = Array.isArray(req.body.tagIds) ? req.body.tagIds.map(Number).filter(Number.isInteger) : []; const stmt = db.prepare('INSERT OR IGNORE INTO material_tags (material_id, tag_id) VALUES (?, ?)'); for (const tagId of tagIds) { stmt.run(Number(req.params.id), tagId); } const tags = db.prepare('SELECT t.id, t.name, t.color FROM tags t JOIN material_tags mt ON mt.tag_id = t.id WHERE mt.material_id = ? ORDER BY t.name').all(Number(req.params.id)); res.json({ tags }); });
app.delete('/api/materials/:id/tags/:tagId', requireAuth, (req, res) => { const row = getMaterial(req.params.id); if (!row) return res.status(404).json({ error: 'Material not found.' }); if (row.uploaded_by !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Only the uploader or admin can modify tags.' }); db.prepare('DELETE FROM material_tags WHERE material_id = ? AND tag_id = ?').run(Number(req.params.id), Number(req.params.tagId)); res.status(204).end(); });

app.get('/api/admin/users', requireAdmin, (_req, res) => res.json({ users: db.prepare('SELECT id, name, email, department, year, role, created_at FROM users ORDER BY created_at DESC').all() }));
app.patch('/api/admin/users/:id', requireAdmin, (req, res) => { const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id); if (!user) return res.status(404).json({ error: 'User not found.' }); const name = String(req.body.name || '').trim(); const email = String(req.body.email || '').trim().toLowerCase(); const department = String(req.body.department || '').trim(); const year = String(req.body.year || '').trim(); const role = req.body.role === 'admin' ? 'admin' : 'user'; if (!name || !/^\S+@\S+\.\S+$/.test(email) || !department || !year) return res.status(400).json({ error: 'Valid name, email, department, and year are required.' }); if (user.id === req.user.id && role !== 'admin') return res.status(400).json({ error: 'You cannot remove your own administrator role.' }); if (user.role === 'admin' && role !== 'admin' && db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'").get().count <= 1) return res.status(400).json({ error: 'The last administrator cannot be demoted.' }); try { db.prepare('UPDATE users SET name = ?, email = ?, department = ?, year = ?, role = ? WHERE id = ?').run(name, email, department, year, role, user.id); auditLog(req.user.id, 'ADMIN_UPDATE_USER', 'user', user.id, req); res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)) }); } catch (error) { if (String(error.message).includes('UNIQUE')) return res.status(409).json({ error: 'Email address already exists.' }); throw error; } });
app.delete('/api/admin/users/:id', requireAdmin, (req, res) => { if (req.params.id === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account.' }); const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id); if (!user) return res.status(404).json({ error: 'User not found.' }); if (user.role === 'admin' && db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'").get().count <= 1) return res.status(400).json({ error: 'The last administrator cannot be deleted.' }); db.prepare('DELETE FROM users WHERE id = ?').run(user.id); auditLog(req.user.id, 'ADMIN_DELETE_USER', 'user', req.params.id, req); res.status(204).end(); });
app.get('/api/admin/materials', requireAdmin, (_req, res) => res.json({ materials: db.prepare('SELECT * FROM materials ORDER BY id DESC').all() }));
app.patch('/api/admin/materials/:id', requireAdmin, (req, res) => { const fields = ['title', 'subject', 'department', 'year', 'description']; const values = fields.map((field) => String(req.body[field] || '').trim()); if (values.some((value) => !value)) return res.status(400).json({ error: 'All material fields are required.' }); const result = db.prepare('UPDATE materials SET title = ?, subject = ?, department = ?, year = ?, description = ? WHERE id = ?').run(...values, Number(req.params.id)); if (!result.changes) return res.status(404).json({ error: 'Material not found.' }); auditLog(req.user.id, 'ADMIN_UPDATE_MATERIAL', 'material', req.params.id, req); res.json({ material: materialView(getMaterial(req.params.id), req.user.id) }); });
app.delete('/api/admin/materials/:id', requireAdmin, (req, res) => { const row = getMaterial(req.params.id); if (!row) return res.status(404).json({ error: 'Material not found.' }); db.prepare('DELETE FROM materials WHERE id = ?').run(row.id); if (row.stored_name) { const storedPath = path.join(config.upload.dir, row.stored_name); if (fs.existsSync(storedPath)) fs.unlinkSync(storedPath); } auditLog(req.user.id, 'ADMIN_DELETE_MATERIAL', 'material', req.params.id, req); res.status(204).end(); });
app.get('/api/materials/:id', (req, res) => { const row = getMaterial(req.params.id); if (!row) return res.status(404).json({ error: 'Material not found.' }); res.json({ material: materialView(row, req.session.user?.id) }); });
app.get('/api/materials/:id/download', requireAuth, (req, res) => {
  const row = getMaterial(req.params.id); if (!row) return res.status(404).json({ error: 'Material not found.' });
  db.prepare('UPDATE materials SET downloads = downloads + 1 WHERE id = ?').run(row.id);
  if (row.stored_name) {
    const safeName = (row.original_name || `${row.title}.${row.type.toLowerCase()}`).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
    return res.download(path.join(config.upload.dir, row.stored_name), safeName);
  }
  res.type('text/plain').send(`${row.title}\n\n${row.description}\n\nSubject: ${row.subject}\nDepartment: ${row.department}\nYear: ${row.year}`);
});

const upload = multer({ storage: multer.diskStorage({ destination: config.upload.dir, filename: (_req, file, callback) => callback(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`) }), limits: { fileSize: config.upload.maxSize }, fileFilter: (_req, file, callback) => callback(null, config.upload.allowedExtensions.includes(path.extname(file.originalname).toLowerCase())) });
app.post('/api/materials', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'A PDF, DOCX, PPTX, or ZIP file is required.' });
  const fields = req.body;
  if (!fields.title?.trim() || !fields.subject?.trim() || !fields.department?.trim() || !fields.year?.trim() || !fields.description?.trim()) { fs.unlinkSync(req.file.path); return res.status(400).json({ error: 'All material fields are required.' }); }
  const result = db.prepare('INSERT INTO materials (title, subject, department, year, type, description, uploaded_by, uploaded_by_name, stored_name, original_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(fields.title.trim(), fields.subject.trim(), fields.department.trim(), fields.year.trim(), path.extname(req.file.originalname).slice(1).toUpperCase(), fields.description.trim(), req.user.id, req.user.name, path.basename(req.file.path), req.file.originalname);
  auditLog(req.user.id, 'MATERIAL_UPLOAD', 'material', result.lastInsertRowid, req);
  res.status(201).json({ material: materialView(getMaterial(result.lastInsertRowid), req.user.id) });
});

app.get('/api/bookmarks', requireAuth, (req, res) => res.json({ materials: db.prepare('SELECT m.* FROM materials m JOIN bookmarks b ON b.material_id = m.id WHERE b.user_id = ? ORDER BY b.created_at DESC').all(req.user.id).map((row) => materialView(row, req.user.id)) }));
app.post('/api/bookmarks/:id', requireAuth, (req, res) => { if (!getMaterial(req.params.id)) return res.status(404).json({ error: 'Material not found.' }); db.prepare('INSERT OR IGNORE INTO bookmarks (user_id, material_id) VALUES (?, ?)').run(req.user.id, Number(req.params.id)); res.status(204).end(); });
app.delete('/api/bookmarks/:id', requireAuth, (req, res) => { db.prepare('DELETE FROM bookmarks WHERE user_id = ? AND material_id = ?').run(req.user.id, Number(req.params.id)); res.status(204).end(); });
app.get('/api/my-materials', requireAuth, (req, res) => res.json({ materials: db.prepare('SELECT * FROM materials WHERE uploaded_by = ? ORDER BY id DESC').all(req.user.id).map((row) => materialView(row, req.user.id)) }));
app.patch('/api/profile', requireAuth, (req, res) => {
  const { name, email, department, year } = req.body;
  const v = config.validation;
  const validYears = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
  if (!name?.trim() || name.length > v.nameMaxLength || !email?.trim() || !department?.trim() || !year?.trim()) return res.status(400).json({ error: 'All profile fields are required.' });
  const departments = db.prepare('SELECT name FROM departments').all().map((d) => d.name);
  if (!departments.includes(department) || !validYears.includes(year)) return res.status(400).json({ error: 'Invalid department or year.' });
  db.prepare('UPDATE users SET name = ?, email = ?, department = ?, year = ? WHERE id = ?').run(name.trim(), email.trim().toLowerCase(), department.trim(), year.trim(), req.user.id);
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) });
});
app.post('/api/profile/password', requireAuth, async (req, res, next) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!await bcrypt.compare(String(req.body.currentPassword || ''), user.password_hash)) return res.status(400).json({ error: 'Current password is incorrect.' });
    const { newPassword, confirmPassword } = req.body;
    if (!newPassword || newPassword.length < config.auth.passwordMinLength || newPassword !== confirmPassword) return res.status(400).json({ error: `New passwords must match and be at least ${config.auth.passwordMinLength} characters.` });
    const history = db.prepare('SELECT password_hash FROM password_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(user.id, config.auth.passwordHistoryCount);
    if (history.some((h) => bcrypt.compareSync(newPassword, h.password_hash))) return res.status(400).json({ error: 'Password recently used. Choose a different one.' });
    const newHash = await bcrypt.hash(newPassword, config.auth.bcryptRounds);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, user.id);
    db.prepare('INSERT INTO password_history (user_id, password_hash) VALUES (?, ?)').run(user.id, newHash);
    req.session.destroy((error) => error ? next(error) : res.clearCookie('connect.sid').status(204).end());
  } catch (error) { next(error); }
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() }));

app.use((error, _req, res, _next) => {
  console.error(error);
  const isProd = config.env === 'production';
  res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 500).json({ error: error.code === 'LIMIT_FILE_SIZE' ? `File exceeds the ${config.upload.maxSize / 1024 / 1024} MB limit.` : (isProd ? 'Unexpected server error.' : error.message) });
});

const keyPath = config.https.keyPath;
const certPath = config.https.certPath;
if (config.https.enabled && (!keyPath || !certPath)) throw new Error('HTTPS_KEY_PATH and HTTPS_CERT_PATH are required in production.');
const server = keyPath && certPath ? https.createServer({ key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }, app) : http.createServer(app);
server.listen(port, () => console.log(`${keyPath && certPath ? 'HTTPS' : 'HTTP'} server running at ${keyPath && certPath ? 'https' : 'http'}://localhost:${port}`));
