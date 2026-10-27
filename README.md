# Evently — Modern Calendar & Event Management System

Evently is an Apple Calendar-inspired, production-ready Calendar and Event Management application designed for focused scheduling and personal productivity. Built with a **React 19 + Vite + Tailwind CSS** frontend and a robust **Django REST Framework** backend, it provides strict multi-tenant user isolation, token-based authentication, real database search, live analytics dashboards, and an integrated administration panel.

---

## Architecture & Technology Stack

```
┌──────────────────────────────────────────────┐
│            Frontend (React 19 + Vite)        │
│  - Tailwind CSS v4 styling                   │
│  - Apple Calendar UI & Figma design system   │
│  - Hosted on Vercel                          │
└──────────────────────┬───────────────────────┘
                       │ HTTPS / JSON API (Bearer Tokens)
┌──────────────────────▼───────────────────────┐
│        Backend (Django REST Framework)       │
│  - HMAC-SHA256 Signed Token Authentication   │
│  - Strict User-Ownership Queryset Isolation  │
│  - Real Database Aggregation & Search        │
│  - Hosted on Render / Railway                │
└──────────────────────┬───────────────────────┘
                       │ Database Connection
┌──────────────────────▼───────────────────────┐
│      Database (SQLite Local / PostgreSQL)    │
│  - Auto-configured via DATABASE_URL          │
└──────────────────────────────────────────────┘
```

- **Frontend:** React 19, TypeScript 5.7, Tailwind CSS v4, Vite 8.
- **Backend:** Python 3.11+, Django 5/6, Django REST Framework, Django CORS Headers.
- **Authentication:** Cryptographically signed Bearer tokens (access + refresh) with automatic background token renewal and optional Google Identity Services (OAuth / OpenID Connect).
- **Database:** SQLite (development default) and managed PostgreSQL (production via `DATABASE_URL`).
- **Hosting Targets:** Vercel (Frontend), Render / Railway (Backend + PostgreSQL).

---

## Key Features

1. **Apple Calendar-Inspired UI:**
   - Smooth Month, Week, Day, and Year navigation with "Today" shortcut.
   - Distinct category-based colors (Personal, College & Clubs, Holidays & Occasions, Deadlines & Tasks, Social).
   - Multi-day event support and month-boundary handling.
   - Dark and Light appearance modes with persistent preference storage.
   - Collapsible sidebar with mini-calendar and upcoming/past event drawers.

2. **Event CRUD & Ownership:**
   - Full event creation, reading, editing, and deletion.
   - Comprehensive form validation (end time must be later than start time).
   - Duplicate submission protection with live loading spinners.
   - **Strict Data Isolation:** Every event is associated with its authenticated owner. Ordinary users cannot see, modify, or delete another user's events (prevents Insecure Direct Object References).

3. **Live Search & Analytics Dashboard:**
   - Full database search querying titles, descriptions, categories, and locations.
   - Real-time aggregated statistics: total events, upcoming count, past count, current week count, current month count, and category distribution bar.

4. **Authentication Lifecycle:**
   - User registration with password strength validation.
   - Username/email login and secure logout.
   - Current user profile endpoint (`/api/auth/me/`).
   - Secure password change (`/api/auth/change-password/`).
   - Automatic token renewal on expiration without page reload interruptions.
   - Ready-to-connect Google OAuth 2.0 integration via Google Identity Services.

5. **Integrated Administration:**
   - Django Admin configured for User and Event management with filters and search.
   - Application-level Admin Dashboard for staff/superusers to inspect registered users and system-wide metrics.
   - Safe user deactivation/reactivation controls with confirmation dialogs.

---

## Prerequisites

- **Mac / Linux / Windows** terminal.
- **Python:** 3.11, 3.12, 3.13, or 3.14.
- **Node.js:** v18, v20, or v22 (with `npm` or `pnpm`).
- **Git** installed.

---

## Local Development Setup

### 1. Backend Setup

Open a terminal and navigate to the `backend/` directory:

```bash
cd backend

# Create virtual environment if not already present
python3 -m venv .venv

# Activate the virtual environment
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create your local environment file
cp .env.example .env

# Apply migrations
python manage.py migrate

# Create a superuser / administrator account
python manage.py createsuperuser

# Start the Django development server
python manage.py runserver 127.0.0.1:8000
```

The Django REST API will be accessible at `http://127.0.0.1:8000/api/` and Django Admin at `http://127.0.0.1:8000/admin/`.

### 2. Frontend Setup

In a new terminal window, navigate to the `calendar/` directory:

```bash
cd calendar

# Install frontend dependencies
npm install

# Create your local environment file
cp .env.example .env

# Start the Vite development server
npm run dev
```

The frontend will run at `http://localhost:5173` (or `http://localhost:8443` depending on your `$PORT` configuration).

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Description | Default / Example |
|---|---|---|
| `SECRET_KEY` | Cryptographic secret for signing tokens and sessions. | Auto-generated or custom 50+ char string |
| `DEBUG` | Enable debug mode during development. Set to `False` in production. | `True` (dev) / `False` (prod) |
| `ALLOWED_HOSTS` | Comma-separated list of permitted hostnames. | `localhost,127.0.0.1` |
| `DATABASE_URL` | PostgreSQL connection string for production. | `postgresql://user:pass@host:5432/dbname` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated exact frontend origins without trailing slashes. | `http://localhost:5173,https://evently.vercel.app` |
| `CSRF_TRUSTED_ORIGINS` | Comma-separated trusted origins for CSRF checks. | `http://localhost:5173,https://evently.vercel.app` |
| `GOOGLE_CLIENT_ID` | (Optional) Google OAuth 2.0 Web Client ID. | `your-id.apps.googleusercontent.com` |
| `ACCESS_TOKEN_LIFETIME` | Lifetime of access tokens in seconds. | `3600` (1 hour) |
| `REFRESH_TOKEN_LIFETIME` | Lifetime of refresh tokens in seconds. | `604800` (7 days) |

### Frontend (`calendar/.env`)

| Variable | Description | Example |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL of the Django REST API. | `http://127.0.0.1:8000/api` |
| `VITE_GOOGLE_CLIENT_ID` | (Optional) Google Web Client ID for Google Sign-In button. | `your-id.apps.googleusercontent.com` |

---

## Google Sign-In Configuration Guide

To enable Google OAuth authentication in Evently:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g. `Evently Calendar`).
3. Under **APIs & Services > OAuth consent screen**:
   - Choose **External** user type.
   - Fill in the App Name (`Evently`), user support email, and developer contact email.
   - Add the scopes: `openid`, `.../auth/userinfo.email`, and `.../auth/userinfo.profile`.
4. Under **APIs & Services > Credentials**:
   - Click **Create Credentials > OAuth client ID**.
   - Select **Web application**.
   - Under **Authorized JavaScript origins**, add:
     - `http://localhost:5173`
     - `http://localhost:8443`
     - `https://your-vercel-domain.vercel.app`
   - Under **Authorized redirect URIs**, add:
     - `http://localhost:5173`
     - `https://your-vercel-domain.vercel.app`
5. Copy the generated **Client ID**.
6. Set the Client ID in both environment files:
   - In `backend/.env`: `GOOGLE_CLIENT_ID=<your-client-id>`
   - In `calendar/.env`: `VITE_GOOGLE_CLIENT_ID=<your-client-id>`
7. Restart the servers. The Google Sign-In button will automatically render on the login screen.

---

## Running Automated Tests

### Backend Tests

From the project root:

```bash
cd backend
source .venv/bin/activate
python manage.py test
```

This runs the 22 comprehensive test suites covering:
- Health checks.
- User registration & password strength validation.
- Login and token renewal.
- Current user profile retrieval.
- Password updates.
- Event creation, listing, updating, and deletion.
- Multi-user isolation (verifying User A cannot access User B's events).
- Start datetime vs. end datetime validation.
- Aggregated dashboard metrics calculations.
- Administrative permission enforcement (ordinary users get 403 Forbidden).

### Frontend Build Verification

From the project root:

```bash
cd calendar
npm run build
```

The build compiles into `calendar/dist/` with 0 warnings or errors.

---

## Deployment Instructions

### 1. Backend & PostgreSQL Deployment (Render / Railway)

#### Option A: Render
1. Push your repository to GitHub.
2. Sign in to [Render](https://render.com/).
3. Click **New + > PostgreSQL**:
   - Name: `evently-db`
   - Database: `evently`
   - Plan: Free / Starter
   - Copy the **Internal Database URL**.
4. Click **New + > Web Service**:
   - Connect your GitHub repository.
   - Root Directory: `backend`
   - Environment: `Python 3`
   - Build Command: `pip install -r requirements.txt && python manage.py collectstatic --noinput`
   - Start Command: `python manage.py migrate && gunicorn config.wsgi:application`
   - Add Environment Variables:
     - `DEBUG`: `False`
     - `SECRET_KEY`: `<Generate a random 50-character string>`
     - `DATABASE_URL`: `<Paste internal database URL>`
     - `ALLOWED_HOSTS`: `.onrender.com`
     - `CORS_ALLOWED_ORIGINS`: `https://your-frontend.vercel.app`
     - `CSRF_TRUSTED_ORIGINS`: `https://your-frontend.vercel.app`

#### Option B: Railway
1. Click **New Project > Provision PostgreSQL**.
2. Click **Add Service > GitHub Repo**, select your repository.
3. In settings, set Root Directory to `/backend`.
4. The included `backend/Procfile` handles migration and startup automatically.
5. Set `DATABASE_URL` referencing the PostgreSQL service.

### 2. Frontend Deployment (Vercel)

1. Sign in to [Vercel](https://vercel.com/) and click **Add New > Project**.
2. Import your GitHub repository.
3. In Project Settings:
   - **Framework Preset:** Vite
   - **Root Directory:** Click `Edit` and select `calendar`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Under **Environment Variables**, add:
   - `VITE_API_BASE_URL`: `https://your-backend.onrender.com/api` (no trailing slash)
   - `VITE_GOOGLE_CLIENT_ID`: `<Your Google Client ID>` (optional)
5. Click **Deploy**.
6. The included `calendar/vercel.json` ensures client-side routes and page refreshes work cleanly.

---

## GitHub Push Steps

To initialize git and push your project to GitHub:

```bash
# 1. Ensure you are in the workspace root
cd /Users/anirbankumarsil/Documents/Calendar_Event_managenent

# 2. Initialize git repository
git init -b main

# 3. Verify .gitignore is in place and secrets are ignored
git status

# 4. Stage all tracked project files
git add .

# 5. Create the initial commit
git commit -m "feat: complete production-ready Evently calendar system with auth, isolation, and dashboard"

# 6. Add your GitHub remote repository (replace with your repo URL)
git remote add origin https://github.com/<your-username>/evently-calendar.git

# 7. Push to GitHub
git push -u origin main
```

---

## Troubleshooting Common Issues

1. **CORS Error in Browser Console:**
   - Ensure `CORS_ALLOWED_ORIGINS` on the backend matches the exact frontend origin, including protocol (`http://` or `https://`), without trailing slashes.
   - Example: `http://localhost:5173` (not `http://localhost:5173/`).

2. **Database Migration Error:**
   - If deploying fresh, run `python manage.py migrate` in the release phase or web startup command.
   - `0002_assign_legacy_events` automatically adopts any legacy events without owners, ensuring existing data is preserved.

3. **Session Expired / 401 Unauthorized:**
   - Evently automatically attempts to refresh access tokens using the refresh token stored in localStorage.
   - If the refresh token has expired (after 7 days), the user is seamlessly prompted to sign in again via the authentication modal.

4. **Google Sign-In Button Not Appearing:**
   - Ensure `VITE_GOOGLE_CLIENT_ID` is set in `calendar/.env` and your local/production URL is registered in Google Cloud Console under Authorized JavaScript Origins.
