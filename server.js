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
const crypto = require('crypto');
const { Pool } = require('pg');
const { priceCart } = require('./products');

const app = express();
const PORT = process.env.PORT || 3000;

// Secret key used to sign login tokens. In production this MUST be
// set as a real environment variable — never hardcode a real secret.
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-this';

// ---- Paystack settings (all come from environment variables) ----
// PAYSTACK_SECRET_KEY : your secret key (sk_test_... while testing, sk_live_... later)
// SITE_URL            : your site's address, e.g. https://unrldszn.onrender.com
// SHIPPING_FEE        : delivery fee in naira (defaults to 0 = free delivery)
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';
const SHIPPING_FEE = Number(process.env.SHIPPING_FEE || 0);

// Render sits behind a proxy; this lets Express know the real address/protocol
app.set('trust proxy', 1);

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
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      reference TEXT NOT NULL UNIQUE,
      user_id INTEGER REFERENCES users(id),
      email TEXT NOT NULL,
      items JSONB NOT NULL,
      subtotal INTEGER NOT NULL,
      shipping INTEGER NOT NULL,
      total INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      delivery JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      paid_at TIMESTAMP
    )
  `);
  console.log('Database ready (users, newsletter, carts, orders tables exist)');
}

// ------------------------------------------------------------
// Middleware (things that run on every request before your routes)
// ------------------------------------------------------------
app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf; }   // raw copy, needed to verify Paystack webhooks
}));
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
// Checkout & Paystack payments
// ------------------------------------------------------------
async function paystackRequest(method, apiPath, body){
  const res = await fetch(PAYSTACK_BASE + apiPath, {
    method,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.status === false){
    throw new Error(json.message || 'Paystack request failed');
  }
  return json;
}

function siteUrl(req){
  return process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;
}

async function loadSavedCart(userId){
  const result = await pool.query('SELECT items FROM carts WHERE user_id = $1', [userId]);
  return result.rows.length ? result.rows[0].items : [];
}

// Asks Paystack whether this payment really succeeded, and only then marks the
// order paid. Safe to call many times (the callback AND the webhook both use it).
async function confirmPayment(reference){
  const found = await pool.query('SELECT * FROM orders WHERE reference = $1', [reference]);
  const order = found.rows[0];
  if (!order) return { ok: false, reason: 'not_found' };
  if (order.status === 'paid') return { ok: true, order };

  const verified = await paystackRequest('GET', `/transaction/verify/${encodeURIComponent(reference)}`);
  const data = verified.data || {};

  // Only trust the payment if status, amount (in kobo) and currency all match our order
  if (data.status === 'success' && data.amount === order.total * 100 && data.currency === 'NGN'){
    const updated = await pool.query(
      "UPDATE orders SET status = 'paid', paid_at = NOW() WHERE reference = $1 AND status <> 'paid' RETURNING *",
      [reference]
    );
    // Order placed, so empty their saved cart
    await pool.query('DELETE FROM carts WHERE user_id = $1', [order.user_id]);
    return { ok: true, order: updated.rows[0] || order };
  }

  if (data.status === 'failed'){
    await pool.query("UPDATE orders SET status = 'failed' WHERE reference = $1 AND status = 'pending'", [reference]);
  }
  return { ok: false, reason: data.status || 'unconfirmed' };
}

// GET /api/checkout/summary — their saved cart, priced by the SERVER
app.get('/api/checkout/summary', requireUser, async (req, res) => {
  try {
    const items = await loadSavedCart(req.user.id);
    res.json(priceCart(items, SHIPPING_FEE));
  } catch (err) {
    console.error('Checkout summary error:', err);
    res.status(500).json({ error: 'Could not load your order.' });
  }
});

// POST /api/checkout — create the order and get a Paystack payment link
app.post('/api/checkout', requireUser, async (req, res) => {
  if (!PAYSTACK_SECRET){
    return res.status(503).json({ error: 'Payments are not set up yet.' });
  }

  // Check the delivery details
  const d = req.body.delivery || {};
  const delivery = {
    fullName: String(d.fullName || '').trim(),
    phone: String(d.phone || '').trim(),
    address: String(d.address || '').trim(),
    city: String(d.city || '').trim(),
    state: String(d.state || '').trim()
  };
  if (delivery.fullName.length < 2 || delivery.fullName.length > 100)
    return res.status(400).json({ error: 'Please enter your full name.' });
  if (!/^[0-9+()\-\s]{7,20}$/.test(delivery.phone))
    return res.status(400).json({ error: 'Please enter a valid phone number.' });
  if (delivery.address.length < 5 || delivery.address.length > 300)
    return res.status(400).json({ error: 'Please enter your delivery address.' });
  if (delivery.city.length < 2 || delivery.city.length > 100)
    return res.status(400).json({ error: 'Please enter your city.' });
  if (delivery.state.length < 2 || delivery.state.length > 100)
    return res.status(400).json({ error: 'Please enter your state.' });

  try {
    const items = await loadSavedCart(req.user.id);
    if (items.length === 0){
      return res.status(400).json({ error: 'Your cart is empty.' });
    }

    // Prices come from products.js, never from the browser
    const priced = priceCart(items, SHIPPING_FEE);
    if (priced.problems.length > 0){
      return res.status(400).json({ error: priced.problems[0] });
    }

    const reference = 'UNR-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();

    await pool.query(
      `INSERT INTO orders (reference, user_id, email, items, subtotal, shipping, total, delivery)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [reference, req.user.id, req.user.email, JSON.stringify(priced.lines),
       priced.subtotal, priced.shipping, priced.total, JSON.stringify(delivery)]
    );

    try {
      const init = await paystackRequest('POST', '/transaction/initialize', {
        email: req.user.email,
        amount: priced.total * 100,          // Paystack wants kobo (₦1 = 100 kobo)
        currency: 'NGN',
        reference,
        callback_url: `${siteUrl(req)}/api/paystack/callback`
      });
      res.json({ authorization_url: init.data.authorization_url, reference });
    } catch (err) {
      await pool.query("UPDATE orders SET status = 'failed' WHERE reference = $1", [reference]);
      console.error('Paystack initialize error:', err.message);
      res.status(502).json({ error: 'Could not start the payment. Please try again.' });
    }
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// GET /api/paystack/callback — Paystack sends the customer back here after paying
app.get('/api/paystack/callback', async (req, res) => {
  const reference = String(req.query.reference || req.query.trxref || '');
  if (!reference) return res.redirect('/');
  try {
    await confirmPayment(reference);
  } catch (err) {
    console.error('Callback confirm error:', err.message);
  }
  res.redirect('/order.html?ref=' + encodeURIComponent(reference));
});

// POST /api/paystack/webhook — Paystack tells us directly when a payment succeeds
// (this covers the case where the customer closes their browser before returning)
app.post('/api/paystack/webhook', async (req, res) => {
  if (!PAYSTACK_SECRET || !req.rawBody){
    return res.sendStatus(400);
  }
  const expected = crypto.createHmac('sha512', PAYSTACK_SECRET).update(req.rawBody).digest('hex');
  const received = String(req.headers['x-paystack-signature'] || '');
  const valid = expected.length === received.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
  if (!valid){
    return res.sendStatus(401);
  }

  const event = req.body || {};
  if (event.event === 'charge.success' && event.data && event.data.reference){
    try {
      await confirmPayment(event.data.reference);
    } catch (err) {
      console.error('Webhook confirm error:', err.message);
    }
  }
  res.sendStatus(200);
});

// GET /api/orders/:reference — an order's details (only visible to the person who placed it)
app.get('/api/orders/:reference', requireUser, async (req, res) => {
  try {
    const reference = req.params.reference;
    let found = await pool.query('SELECT * FROM orders WHERE reference = $1 AND user_id = $2', [reference, req.user.id]);
    if (found.rows.length === 0){
      return res.status(404).json({ error: 'Order not found.' });
    }
    // Still pending? Ask Paystack, so refreshing the page can update the status.
    if (found.rows[0].status === 'pending'){
      try { await confirmPayment(reference); } catch (err) { /* keep pending */ }
      found = await pool.query('SELECT * FROM orders WHERE reference = $1 AND user_id = $2', [reference, req.user.id]);
    }
    const o = found.rows[0];
    res.json({
      reference: o.reference, status: o.status, items: o.items,
      subtotal: o.subtotal, shipping: o.shipping, total: o.total,
      delivery: o.delivery, created_at: o.created_at, paid_at: o.paid_at
    });
  } catch (err) {
    console.error('Order lookup error:', err);
    res.status(500).json({ error: 'Could not load this order.' });
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
