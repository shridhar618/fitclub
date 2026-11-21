# FitClub

A full-stack fitness web app with user accounts, profile management, progress tracking and an AI fitness chatbot powered by Google Gemini.

## Features

- Sign up and login with bcrypt password hashing and SQLite-backed sessions
- User profiles with profile-image upload (resized with Sharp)
- Fitness and progress pages with charts (Chart.js)
- AI fitness chatbot using the Google Gemini API
- Admin dashboard with user list and site stats

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express, express-session |
| Database | SQLite (created automatically on first run) |
| AI | Google Gemini (`@google/generative-ai`) |
| Frontend | HTML, CSS, JavaScript, Chart.js |
| Uploads | Multer, Sharp |

## Getting started

```bash
npm install
cp .env.example .env    # fill in GEMINI_API_KEY, SESSION_SECRET, etc.
npm start
```

The SQLite databases are created in `db/` on first start.

## Project structure

```
server.js          Express server: auth, profile, admin and API routes
public/            Front-end pages (home, login, dashboard, fitness, progress, chatbot)
public/css, js/    Styles and client-side scripts
.env.example       Required environment variables
```
