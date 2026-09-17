# EduBridge - Student Study Platform

A full-stack student platform built with semantic HTML5, CSS3, Bootstrap 5, Font Awesome, vanilla ES6 JavaScript, Express, SQLite, secure sessions, bcrypt password hashing, and private file storage.

## Run locally

Install dependencies and start the application from the repository root:

```powershell
npm install
Copy-Item .env.example .env
npm start
```

Then visit `http://localhost:5500`.

## Included views

Landing page, login, registration, dashboard, materials library, material details, upload flow, my materials, bookmarks, profile, about, and contact.

The backend creates `data/edubridge.db`, stores sessions in SQLite, and keeps uploaded files under `private-uploads/`, outside the public static directory. Opening HTML with `file://` remains available only as an offline demo fallback.

## Roles

New accounts are normal users. The development administrator is created automatically when the database is first started:

```text
Email: admin@edubridge.local
Password: Admin@12345
```

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` before first production startup. Administrators can open `admin.html` to add, rename, and delete subjects, and edit or delete materials. Normal users receive `403` responses for administrator APIs.

## Route structure

Public pages are `index.html`, `about.html`, `contact.html`, `login.html`, and `register.html`.
All workspace pages require a valid local session and redirect to `login.html` when opened directly without one.

The shared `app.js` owns the UI and API client. `server.js` owns authentication, authorization, SQLite persistence, sessions, upload validation, private downloads, and profile operations. New accounts use bcrypt password hashes; passwords are never stored in the database as plaintext.

## Security boundary

Production protections include HTTP security headers, secure HTTP-only SameSite cookies, server-side sessions, authentication rate limiting, origin checks for state-changing requests, parameterized SQL, ownership checks, file-size/type limits, and storage outside the public web root. In production, set a random `SESSION_SECRET` of at least 32 characters and configure HTTPS certificates or a managed TLS reverse proxy.
