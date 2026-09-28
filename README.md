# UNRLDSZN Backend — Setup Guide

This is your first backend server. It does two jobs:
1. Serves your website files (put your `index.html`, `shop.html`, `unrlszn.css`, `common.js`, etc. inside the `public/` folder)
2. Handles account signup/login through a real database

## 1. Install Node.js
If you don't already have it: download and install from https://nodejs.org (choose the LTS version). This gives you the `node` and `npm` commands in your terminal.

## 2. Put your website files in the `public` folder
Copy **all** your existing site files (`index.html`, `shop.html`, `unrlszn.css`, `common.js`, `home.js`, `shop.js`, your images, `logo.png`, everything) into the `public/` folder in this project. That's the folder the server will serve to visitors.

## 3. Install dependencies
Open a terminal, navigate into this project folder, and run:
```
npm install
```
This downloads the few packages the server needs (Express, bcrypt, etc.) into a `node_modules` folder.

## 4. Set up your secret key
Copy `.env.example` to a new file named `.env`:
```
cp .env.example .env
```
Then open `.env` and replace the placeholder `JWT_SECRET` value with a real random string. You can generate one by running:
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Paste the result into `.env`.

## 5. Run the server
```
npm start
```
You should see:
```
UNRLDSZN server running at http://localhost:3000
```
Open that URL in your browser — your actual website should load, now served by your own backend.

## What's working right now
- `POST /api/signup` — creates a real account, password is securely hashed (never stored in plain text)
- `POST /api/login` — checks credentials against the database
- `POST /api/logout` — logs someone out
- `GET /api/me` — tells the frontend who (if anyone) is currently logged in

Your database is a single file: `database.sqlite`, created automatically the first time you run the server. You can peek inside it anytime using a free tool like [DB Browser for SQLite](https://sqlitebrowser.org/) if you're curious what's actually stored.

## Next steps (not done yet)
- Connect your existing login/signup forms in `common.js` to actually call these endpoints (currently they still just log a placeholder message — this is the next thing we'll do together)
- Deploy this to Render so it's live on the internet, not just on your computer

## Troubleshooting
- **"command not found: node"** → Node.js isn't installed, or your terminal needs restarting after installing it
- **Port already in use** → close any other running copy of the server, or change `PORT` in `.env`
- **Changes to your HTML/CSS not showing up** → make sure you edited the files inside `public/`, not somewhere else, and hard-refresh your browser
