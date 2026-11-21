# FitClub

![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white) ![Express](https://img.shields.io/badge/Express-000000?logo=express&logoColor=white) ![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white) ![Google Gemini](https://img.shields.io/badge/Google%20Gemini-8E75B2?logo=googlegemini&logoColor=white) ![License: ISC](https://img.shields.io/badge/License-ISC-lightgrey)

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

## Environment variables

Copy `.env.example` to `.env`. It also lists `DB_*` entries, which the current SQLite setup does not read.

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | Port the server listens on | - |
| `GEMINI_API_KEY` | Google Gemini key for the chatbot | - |
| `SESSION_SECRET` | Secret used to sign session cookies | - |
| `NODE_ENV` | `development` or `production` | - |

## Project structure

```
server.js          Express server: auth, profile, admin and API routes
public/            Front-end pages (home, login, dashboard, fitness, progress, chatbot)
public/css, js/    Styles and client-side scripts
.env.example       Required environment variables
```

## License

ISC, as declared in `package.json`.
