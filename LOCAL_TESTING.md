# Running the Project Locally

Follow the steps below to run both the backend and frontend locally with full connectivity.

---

## 1. Start the Backend

Open your first terminal.

```bash
cd backend

pip install django==5.0.6 \
channels==4.1.0 \
daphne==4.1.2 \
dj-database-url==2.2.0 \
whitenoise==6.6.0 \
reportlab==4.2.0 \
Pillow==10.3.0 \
python-dotenv==1.0.1 \
django-cors-headers==4.4.0
```

Create a local environment file.

```bash
cat > .env << 'EOF'
DJANGO_SECRET_KEY=local-dev-secret
DEBUG=True
ALLOWED_HOSTS=*
DATABASE_URL=sqlite:///db.sqlite3
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
EOF
```

Run the Django setup.

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py collectstatic --noinput
```

Start the ASGI server.

```bash
daphne -b 127.0.0.1 -p 8000 core.asgi:application
```

The backend will be available at:

```
http://127.0.0.1:8000
```

---

## 2. Start the Frontend

Open a second terminal.

```bash
cd frontend-react

npm install
```

Create the frontend environment file.

```bash
echo "VITE_API_URL=http://127.0.0.1:8000" > .env
```

Start the development server.

```bash
npm run dev
```

The frontend will typically be available at:

```
http://localhost:5173
```

---

## 3. Open the Application

Open your browser and navigate to:

```
http://localhost:5173
```

You can now use the application with the backend fully connected.

### Verify the Integration

1. Create a new account or log in.
2. Authentication requests are handled by the Django backend.
3. Click **Launch Demo**.
4. Grant camera permission.
5. The frontend will stream live tracking data to the backend through WebSockets.
6. End the session.
7. Navigate to **History** to view saved sessions.
8. Download the generated PDF report for any completed session.

---

# Local Development Notes

During local development:

- The frontend communicates with the backend using REST APIs and WebSockets.
- Authentication is handled using Django session cookies.
- Session data is stored in the local SQLite database.
- PDF reports are generated locally.

---

# Common Issues

### Login Required or Authentication Fails

If login succeeds but subsequent requests return **"Login required"**, verify that:

- `backend/.env` contains the correct frontend origin.

Example:

```env
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

If Vite automatically starts on another port (for example `5174` because `5173` is already in use), update the value accordingly.

---

### CORS Errors

If the browser reports CORS errors:

- Ensure the frontend URL matches one of the origins listed in `CORS_ALLOWED_ORIGINS`.
- Restart the backend after modifying the `.env` file.

---

### Cookies Not Being Sent

During local development (`DEBUG=True`), Django uses the default `SameSite=Lax` session cookie behavior.

Because both applications run on `localhost` (different ports but the same site), session cookies work correctly without additional configuration.

In production (`DEBUG=False`), where the frontend and backend are hosted on different domains (e.g., Vercel and Render), the backend automatically switches to the required cross-site cookie configuration (`SameSite=None` with `Secure=True`) to support authenticated requests across domains.

---

# Local Architecture

```
Browser
      │
      ▼
React + Vite (localhost:5173)
      │
      ├──────── REST API ───────► Django
      │
      └────── WebSocket ────────► Django Channels
                                      │
                                      ▼
                                SQLite Database
                                      │
                                      ▼
                                PDF Report Generator
```

Once both servers are running, the application behaves the same as it does in production, except that everything runs locally on your machine.