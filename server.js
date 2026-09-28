// ============================================================
// UNRLDSZN Backend Server
// Handles: user signup/login, and serving your website files.
// ============================================================

require('dotenv').config();

const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { DatabaseSync } = require('node:sqlite'); // built into Node — no install/compiling needed

const app = express();
const PORT = process.env.PORT || 3000;

// Secret key used to sign login tokens. In production this MUST be
// set as a real environment variable (see .env.example) — never
// hardcode a real secret and commit it anywhere public.
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-this';

// ------------------------------------------------------------
// Database setup
// ------------------------------------------------------------
// This creates (or opens, if it already exists) a file called
// "database.sqlite" sitting right next to this server file.
// That one file IS your entire database — no separate database
// server to install or manage.
const db = new DatabaseSync(path.join(__dirname, 'database.sqlite'));

// Create the "users" table the first time the server ever runs.
// If it already exists, this line does nothing (safe to re-run).
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// ------------------------------------------------------------
// Middleware (things that run on every request before your routes)
// ------------------------------------------------------------
app.use(express.json());       // lets us read JSON sent from the frontend (req.body)
app.use(cookieParser());       // lets us read/set cookies (used to keep someone logged in)
app.use(express.static(path.join(__dirname, 'public'))); // serves index.html, shop.html, css, js, images

// ------------------------------------------------------------
// Helper: verify a login token from the cookie
// ------------------------------------------------------------
function getUserFromRequest(req){
  const token = req.cookies.token;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET); // returns { id, name, email }
  } catch (err) {
    return null; // token missing, expired, or invalid
  }
}

// ------------------------------------------------------------
// POST /api/signup — create a new account
// ------------------------------------------------------------
app.post('/api/signup', (req, res) => {
  const { name, email, password } = req.body;

  // Basic validation
  if (!name || !email || !password){
    return res.status(400).json({ error: 'Name, email, and password are all required.' });
  }
  if (password.length < 6){
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  // Check if this email is already registered
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing){
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  // Hash the password before storing it — this is the critical security step.
  // "10" is the hashing cost (higher = slower but more secure; 10 is a solid default).
  const passwordHash = bcrypt.hashSync(password, 10);

  const result = db.prepare(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)'
  ).run(name, email.toLowerCase(), passwordHash);

  // Log them in immediately after signing up
  const token = jwt.sign(
    { id: result.lastInsertRowid, name, email: email.toLowerCase() },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.cookie('token', token, {
    httpOnly: true,           // JavaScript on the page can't read this cookie — safer against attacks
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.json({ success: true, user: { name, email: email.toLowerCase() } });
});

// ------------------------------------------------------------
// POST /api/login — check email/password, log them in
// ------------------------------------------------------------
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password){
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user){
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  const passwordMatches = bcrypt.compareSync(password, user.password_hash);
  if (!passwordMatches){
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.json({ success: true, user: { name: user.name, email: user.email } });
});

// ------------------------------------------------------------
// POST /api/logout
// ------------------------------------------------------------
app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

// ------------------------------------------------------------
// GET /api/me — "who is currently logged in?" (frontend checks this on page load)
// ------------------------------------------------------------
app.get('/api/me', (req, res) => {
  const user = getUserFromRequest(req);
  if (!user){
    return res.status(401).json({ loggedIn: false });
  }
  res.json({ loggedIn: true, user: { name: user.name, email: user.email } });
});

// ------------------------------------------------------------
// Start the server
// ------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`UNRLDSZN server running at http://localhost:${PORT}`);
});
