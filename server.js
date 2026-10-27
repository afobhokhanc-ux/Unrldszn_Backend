// ============================================================
// UNRLDSZN Backend Server
// Handles: user signup/login, and serving your website files.
// Database: PostgreSQL (persistent — data survives redeploys/restarts)
// ============================================================

require('dotenv').config();

const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Secret key used to sign login tokens. In production this MUST be
// set as a real environment variable — never hardcode a real secret.
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-this';

// ------------------------------------------------------------
// Database setup
// ------------------------------------------------------------
// DATABASE_URL is provided automatically by Render once you attach
// a PostgreSQL database to this service. Locally, set it in your
// .env file (see .env.example) pointing at a local Postgres instance.
//
// Render's Postgres requires SSL, but rejects the default strict
// certificate check on the free tier — this config handles both
// local (no SSL) and Render (SSL, relaxed cert check) automatically.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com')
    ? { rejectUnauthorized: false }
    : false
});

// Create the "users" table the first time the server ever runs.
// If it already exists, this does nothing (safe to re-run).
async function initDb(){
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  // One row per user. "items" holds their whole cart as JSON, for example:
  // [{ "name": "UNRLD Polo (M)", "price": 25000, "qty": 2, "image": "poloA.JPG" }]
  await pool.query(`
    CREATE TABLE IF NOT EXISTS carts (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      items JSONB NOT NULL DEFAULT '[]',
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('Database ready (users, newsletter, carts tables exist)');
}

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
app.post('/api/signup', async (req, res) => {
  const { name, email, password } = req.body;

  // Basic validation
  if (!name || !email || !password){
    return res.status(400).json({ error: 'Name, email, and password are all required.' });
  }
  if (password.length < 6){
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const normalizedEmail = email.toLowerCase();

  try {
    // Check if this email is already registered
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length > 0){
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Hash the password before storing it — never store plain text passwords.
    const passwordHash = bcrypt.hashSync(password, 10);

    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [name, normalizedEmail, passwordHash]
    );
    const newUserId = result.rows[0].id;

    // Log them in immediately after signing up
    const token = jwt.sign(
      { id: newUserId, name, email: normalizedEmail },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,           // JavaScript on the page can't read this cookie — safer against attacks
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({ success: true, user: { name, email: normalizedEmail } });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// ------------------------------------------------------------
// POST /api/login — check email/password, log them in
// ------------------------------------------------------------
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password){
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const normalizedEmail = email.toLowerCase();

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
    const user = result.rows[0];

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
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
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
// POST /api/newsletter — save an email to the mailing list
// ------------------------------------------------------------
app.post('/api/newsletter', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();

  // Simple email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  try {
    // ON CONFLICT DO NOTHING: if the email is already subscribed, we just
    // succeed quietly instead of showing an error.
    await pool.query(
      'INSERT INTO newsletter_subscribers (email) VALUES ($1) ON CONFLICT (email) DO NOTHING',
      [email]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Newsletter error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// ------------------------------------------------------------
// Cart endpoints (logged-in users only)
// ------------------------------------------------------------
function requireUser(req, res, next){
  const user = getUserFromRequest(req);
  if (!user){
    return res.status(401).json({ error: 'Please log in first.' });
  }
  req.user = user;
  next();
}

// Clean up whatever the browser sends so we never store junk
function sanitizeCartItems(items){
  if (!Array.isArray(items) || items.length > 50) return null;
  const clean = [];
  for (const item of items){
    if (!item || typeof item.name !== 'string' || item.name.length === 0 || item.name.length > 200) return null;
    const price = Number(item.price);
    const qty = Number(item.qty);
    if (!Number.isFinite(price) || price < 0) return null;
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) return null;
    const image = typeof item.image === 'string' ? item.image.slice(0, 500) : '';
    clean.push({ name: item.name, price, qty, image });
  }
  return clean;
}

// GET /api/cart — fetch the saved cart
app.get('/api/cart', requireUser, async (req, res) => {
  try {
    const result = await pool.query('SELECT items FROM carts WHERE user_id = $1', [req.user.id]);
    res.json({ items: result.rows.length ? result.rows[0].items : [] });
  } catch (err) {
    console.error('Cart load error:', err);
    res.status(500).json({ error: 'Could not load your cart.' });
  }
});

// PUT /api/cart — replace the saved cart with the one sent
app.put('/api/cart', requireUser, async (req, res) => {
  const items = sanitizeCartItems(req.body.items);
  if (items === null){
    return res.status(400).json({ error: 'Invalid cart data.' });
  }
  try {
    await pool.query(
      `INSERT INTO carts (user_id, items, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET items = $2, updated_at = NOW()`,
      [req.user.id, JSON.stringify(items)]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Cart save error:', err);
    res.status(500).json({ error: 'Could not save your cart.' });
  }
});

// ------------------------------------------------------------
// Start the server
// ------------------------------------------------------------
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`UNRLDSZN server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to the database:', err);
    process.exit(1);
  });