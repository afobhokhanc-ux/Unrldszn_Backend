# UNRLDSZN Backend — Setup Guide

This backend serves your website AND handles account signup/login through a real, **persistent** PostgreSQL database — meaning your data survives restarts and redeploys.

## Local setup

### 1. Install Node.js
https://nodejs.org (LTS version) if you don't have it already.

### 2. Install PostgreSQL locally
Download from https://www.postgresql.org/download/ and install it (remember the password you set for the `postgres` user during install).

Once installed, create a database for this project. Open a terminal and run:
```
psql -U postgres -c "CREATE DATABASE unrldszn;"
```
(It'll ask for the password you set during install.)

### 3. Put your website files in the `public` folder
Copy all your site files (`index.html`, `shop.html`, `unrlszn.css`, `common.js`, `home.js`, `shop.js`, images, `logo.png`, etc.) into `public/`.

### 4. Install dependencies
```
npm install
```

### 5. Set up your `.env` file
Copy `.env.example` to `.env`, then fill in:
- `JWT_SECRET` — generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `DATABASE_URL` — something like `postgresql://postgres:yourpassword@localhost:5432/unrldszn` (use the password you set in step 2)

### 6. Run the server
```
npm start
```
You should see:
```
Database ready (users table exists)
UNRLDSZN server running at http://localhost:3000
```

## Deploying to Render (with a real persistent database)

1. On Render, click **New +** → **PostgreSQL**. Give it a name, choose the Free plan, click Create Database. Wait for it to finish provisioning.
2. Open your existing Web Service (or create one, connected to your GitHub repo).
3. In your Web Service's **Environment** settings, click **Add Environment Variable** → but instead, look for **"Add from Database"** or link the database directly — Render will offer to automatically set `DATABASE_URL` for you when you connect the two. This is the easiest path; follow Render's on-screen prompt to link your new Postgres database to this web service.
4. Confirm `JWT_SECRET` is still set as an environment variable too.
5. Redeploy (Manual Deploy → Deploy latest commit).

Once connected this way, your data (user accounts, and anything else we add to the database later) will persist properly — no more disappearing on redeploy.

## What's working right now
- `POST /api/signup` — creates a real account, password securely hashed
- `POST /api/login` — checks credentials against the database
- `POST /api/logout` — logs someone out
- `GET /api/me` — tells the frontend who's currently logged in

## Troubleshooting
- **"password authentication failed"** → double check the password in your `DATABASE_URL` matches what you set for the `postgres` user
- **"database does not exist"** → make sure you ran the `CREATE DATABASE unrldszn;` command in step 2
- **Works locally but fails on Render** → make sure you actually linked the Postgres database to your Web Service in the Render dashboard (step 3 above) rather than manually typing a DATABASE_URL
