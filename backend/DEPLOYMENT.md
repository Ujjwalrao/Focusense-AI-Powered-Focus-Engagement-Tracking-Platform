# Focusense — Free-Tier Deployment Guide

Is guide me poora deployment cover hai: Supabase (database) + Render ya Railway (app hosting). Naya architecture (Human.js client-side pivot ke baad) server-side bahut halka hai — koi TensorFlow/OpenCV load nahi hota, isliye free tier pe fit hona pehle se kaafi aasan hai.

---

## 1. Supabase Postgres setup (5 min)

1. [supabase.com](https://supabase.com) pe free account banao, naya project create karo.
2. **Project Settings → Database → Connection String → URI** pe jaao.
3. Do options milenge — **Session pooler (port 6543)** wala use karo, direct connection (5432) nahi. Wajah: Render/Railway free tier har request pe naya connection khol sakta hai, aur Postgres free tier limited connections deta hai (~60). Pooler in connections ko efficiently reuse karta hai.
4. Yeh URL apne `.env` / hosting dashboard me `DATABASE_URL` ke naam se daal do.

```
DATABASE_URL=postgresql://postgres.xxxxxxxx:[email protected]:6543/postgres
```

---

## 2. Render.com setup (recommended — free tier WebSockets support karta hai)

1. GitHub pe apna `emotion_saas/` repo push karo.
2. Render dashboard → **New → Web Service** → apna repo connect karo.
3. Settings:
   - **Build Command**: `pip install -r requirements.txt && python manage.py collectstatic --noinput`
   - **Start Command**: `daphne -b 0.0.0.0 -p $PORT core.asgi:application`
   - **Instance Type**: Free
4. Environment variables add karo (Render dashboard → Environment):
   - `DJANGO_SECRET_KEY` — koi bhi random 50-character string (Python me `secrets.token_urlsafe(50)` se generate kar sakte ho)
   - `DEBUG` = `False`
   - `ALLOWED_HOSTS` = `your-app-name.onrender.com`
   - `DATABASE_URL` — Supabase se copy kiya hua
   - `CORS_ALLOWED_ORIGINS` = `https://your-frontend.vercel.app` — ⚠️ React frontend (Step-9 wala `frontend-react/`) yahan se connect karega, iske bina login/history/WebSocket sab reject ho jaayenge cross-origin check me. Maine yeh poora flow (login → cookie → WebSocket auth → history → PDF) end-to-end test karke verify kiya hai — `frontend-react/README.md` me poori detail hai.
5. Deploy karo. Pehli deploy pe `release` phase (Procfile se) migrations chala dega.

### ✅ WebSockets Render pe kaam karte hain?
Haan — Render ke **Web Services** (free tier included) WebSocket connections ko automatically support karte hain, koi extra config nahi chahiye. TLS khud Render handle karta hai, isliye frontend `wss://` use karega automatically jab site `https://` pe ho (jo tumhare `dashboard.html` ke JS me already `window.location.protocol === "https:" ? "wss" : "ws"` se handle ho raha hai).

---

## 3. Railway.app — alternative

Railway ka flow bahut similar hai:
1. GitHub repo import karo.
2. Railway khud `Procfile` detect kar lega.
3. Variables tab me wahi 4 env vars add karo (upar wale).
4. Railway apna khud ka Postgres bhi offer karta hai agar Supabase nahi use karna — lekin dono free tier ka combined limit dhyan me rakhna (Railway free tier: $5 one-time credit/month, hamesha ke liye free nahi, jabki Render free web service hamesha free hai but sleeps).

---

## 4. Free-tier ki 3 honest limitations (in se bachne ka tareeka)

### (a) Render free tier "sleeps" after 15 min inactivity
Agar 15 min tak koi request nahi aati, instance so jaata hai. Agla request aane pe **cold start ~30-50 sec** lagta hai. Fix: ya to user ko batao "pehli load thodi slow hogi", ya ek free uptime-monitor (e.g. UptimeRobot, free) se har 10 min pe health-check ping bhejwa do taaki instance sota hi na — lekin dhyan rakho, yeh Render ki free-tier spirit ke thoda against hai, zaroorat pade tabhi karo.

### (b) Media files (PDF reports) ephemeral hain
Render/Railway free tier ka disk **persistent nahi hai** — restart/redeploy pe `media/` folder ka content delete ho jaata hai. Matlab purani PDF reports gayab ho jaayengi.
- **Sabse simple free fix**: PDF ko on-demand regenerate karo (`reports/pdf_generator.py` already fast hai, ~50ms) instead of file store pe depend karna — `download_report` view me file check karne ki jagah seedha regenerate kar do agar file missing mile.
- **Better fix (still free)**: Supabase Storage (free tier 1GB) — PDF ko Supabase bucket me upload karo instead of local disk. `django-storages` package + Supabase S3-compatible endpoint se ho jaata hai.

### (c) In-memory Channel Layer single-instance tak hi kaam karta hai
`settings.py` me humne `InMemoryChannelLayer` rakha hai — yeh free tier pe theek hai kyunki free tier vaise bhi sirf 1 instance deta hai. Agar kabhi paid tier pe multiple instances/autoscaling karoge, tab `channels_redis` pe switch karna zaroori hoga (settings.py me already commented-out block hai — bas uncomment karke Upstash ka free Redis URL daal dena).

---

## 5. Deploy se pehle ka checklist

- [ ] `DEBUG=False` set hai production me
- [ ] `DJANGO_SECRET_KEY` random aur secret hai (kabhi GitHub pe commit mat karna)
- [ ] `ALLOWED_HOSTS` me apna real domain hai
- [ ] Supabase connection **pooler URL** (6543) use kiya hai, direct (5432) nahi
- [ ] `python manage.py collectstatic` build step me chal raha hai (Whitenoise static files serve karega)
- [ ] Human.js CDN (`cdn.jsdelivr.net`) tumhare `ALLOWED_HOSTS`/CSP me blocked nahi hai (default Django koi CSP nahi lagata, so usually fine)
