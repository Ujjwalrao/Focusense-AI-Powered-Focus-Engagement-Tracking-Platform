# Focusense — Fully Connected Project

Focusense is a real-time AI-powered focus and engagement tracking platform built with a decoupled architecture. The project consists of a **Django backend** and a **React frontend**, deployed independently while communicating seamlessly through REST APIs and WebSockets.

```
focusense_full/
├── backend/           # Django + Channels (Render / Railway)
└── frontend-react/    # React + Vite (Vercel)
```

This setup has been **implemented, deployed, and verified through end-to-end testing**. The integration described below is based on actual testing—not theoretical implementation.

---

# Architecture

The frontend and backend communicate using two independent channels.

### REST API

Used for:

- User registration
- Login & logout
- Authentication
- Session history
- PDF report downloads

All authenticated requests use secure cookies.

---

### WebSocket

Used for real-time communication.

The React application continuously sends camera analysis summaries to the Django backend.

The backend:

- associates data with the authenticated user
- stores session statistics
- saves engagement metrics
- generates a PDF report when a session ends

---

# Cross-Origin Configuration

The frontend and backend are deployed on different domains.

Example:

Frontend

```
https://focusense.vercel.app
```

Backend

```
https://focusense.onrender.com
```

Because of this, the backend is configured with:

- CORS
- CSRF protection
- Cross-domain cookies

These settings are already configured inside the Django project.

---

# End-to-End Verification

The complete integration has been verified using real HTTP requests and browser testing.

| Test | Result |
|------|--------|
| CORS headers | ✅ Verified |
| CSRF cookie flow | ✅ Verified |
| CSRF token rotation | ✅ Verified |
| Cookie-based authentication | ✅ Verified |
| WebSocket authentication | ✅ Verified |
| Session history API | ✅ Verified |
| PDF generation | ✅ Verified |
| React production build | ✅ Successful |
| Lint (`oxlint`) | ✅ 0 errors |
| `VITE_API_URL` build injection | ✅ Verified |

---

# Deployment Guide

## Step 1 — Deploy Backend

Deploy the `backend/` directory to Render or Railway.

Follow:

```
backend/DEPLOYMENT.md
```

After deployment you'll receive a URL similar to:

```
https://focusense-xyz.onrender.com
```

---

## Step 2 — Deploy Frontend

Deploy `frontend-react/` to Vercel.

Follow:

```
frontend-react/README.md
```

Set:

```
VITE_API_URL=https://focusense-xyz.onrender.com
```

---

## Step 3 — Update Backend

Once Vercel provides your frontend URL, update:

```
ALLOWED_HOSTS

CORS_ALLOWED_ORIGINS
```

Then redeploy the backend.

This final redeployment is expected because the frontend URL only exists after the first deployment.

---

# Running Frontend Only

The React application can also run without the backend.

Simply leave:

```
VITE_API_URL
```

unset.

The application will still provide:

- Live camera
- Face tracking
- Human.js analysis
- Real-time UI
- Engagement detection

The following features require the backend:

- Login
- Signup
- Session history
- PDF reports
- Database storage

This mode is ideal for portfolio demonstrations and UI showcases.

---

# Tech Stack

## Frontend

- React
- Vite
- Human.js
- WebSocket
- Fetch API

## Backend

- Django
- Django REST Framework
- Django Channels
- SQLite/PostgreSQL
- ReportLab (PDF generation)

---

# Project Structure

```
focusense_full/
│
├── backend/
│   ├── accounts/
│   ├── focus/
│   ├── reports/
│   ├── websocket/
│   └── manage.py
│
└── frontend-react/
    ├── src/
    ├── public/
    ├── package.json
    └── vite.config.js
```

---

# Features

- AI-powered focus tracking
- Real-time face analysis
- Emotion detection
- Engagement scoring
- Liveness detection
- Age & gender estimation
- Cookie-based authentication
- WebSocket streaming
- Automatic PDF report generation
- Session history dashboard
- Cross-domain deployment support

---

# License

This project is intended for educational, research, and portfolio purposes.