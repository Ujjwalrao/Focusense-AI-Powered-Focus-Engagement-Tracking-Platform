# Focusense — Frontend (React + Vite)

Standalone flagship UI — landing page + live on-device tracking demo.
Deployable to Vercel independently of the Django backend.

## Local dev

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. `/app` route camera access maangega — `localhost` pe bina HTTPS ke bhi chalega (browsers isko special-case karte hain).

## Deploy to Vercel

1. Is `focusense-frontend/` folder ko apne GitHub repo me push karo (`frontend/`+`backend/` wale bade project se **alag** repo rakhna simpler hai, ya monorepo me subfolder bhi chalega — Vercel "Root Directory" setting se handle ho jaata hai).
2. [vercel.com](https://vercel.com) → **New Project** → repo import karo.
3. Framework Preset: **Vite** (Vercel khud detect kar lega).
4. Agar monorepo me hai, **Root Directory** = `focusense-frontend` set karo.
5. Environment Variable (optional):
   ```
   VITE_API_URL = https://your-backend.onrender.com
   ```
6. Deploy dabao.

`vercel.json` me SPA rewrite already daal diya hai — isके bina `/app` route pe refresh karne se 404 aata (Vercel default static hosting client-side routes nahi samajhta).

## Do modes — dono kaam karte hain

**Standalone demo mode** (`VITE_API_URL` set nahi kiya): `/app` pe camera + poora Human.js analysis chalega, sirf server pe kuch save nahi hoga. Portfolio demo ke liye yeh kaafi hai — zero backend dependency.

**Connected mode** (`VITE_API_URL` set kiya): poora flow kaam karta hai — signup/login (`/signup`, `/login`), live session tracking (server pe save hota hai), session history (`/history`), aur PDF report download. Maine yeh **poora chain end-to-end actually test kiya hai** (login → cross-domain cookie → WebSocket auth → DB save → history API → PDF download) — sab real requests se verify kiya, sirf design nahi kiya.

## ⚠️ Connected mode ke liye 1 zaroori backend change

Vercel aur Render/Railway alag domains hain — Django ka CORS/CSRF system dono ko ek dusre ko trust karna sikhata hai. Backend deploy karte waqt `ALLOWED_HOSTS` **aur** `CORS_ALLOWED_ORIGINS` dono env vars me apna Vercel domain add karna hoga:

```
ALLOWED_HOSTS=your-backend.onrender.com,your-app.vercel.app
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app
```

Iske bina login/history/WebSocket sab cross-origin check me reject ho jaayenge — maine yeh exact failure locally reproduce karke fix kiya hai, isliye confidently keh sakta hoon ki yeh step zaroori hai.

Production me (`DEBUG=False`) backend khud `SESSION_COOKIE_SAMESITE=None` + `Secure=True` set kar deta hai (settings.py me already hai) — cross-domain cookies ke liye yeh zaroori hai aur sirf HTTPS pe kaam karta hai (Render/Vercel dono free HTTPS dete hain, isliye koi extra kaam nahi).

## Design system (for future edits)

- **Colors**: graphite (`#101216`) background, amber (`#FFB020`) primary signal, cyan (`#5EEAD4`) secondary, rose (`#FB6F6F`) alerts.
- **Type**: Instrument Serif (display/headlines), Inter (body), IBM Plex Mono (data readouts, `channel-tag` labels).
- **Signature element**: `src/components/SignalWave.jsx` — canvas-based oscilloscope-style waveform. Idle mode (landing) = ambient breathing motion; live mode (dashboard) = driven by real engagement score.
