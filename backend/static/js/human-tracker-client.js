/**
 * static/js/human-tracker-client.js
 * -----------------------------------
 * Yeh file MoodMe/MorphCast jaisa "server-free" experience deti hai.
 * Poora AI (face detect, emotion, age, gender, gaze/attention, liveness)
 * BROWSER ke andar chalta hai — Human.js library (open-source, MIT
 * license, github.com/vladmandic/human) TensorFlow.js + WebGL use
 * karke GPU-accelerated inference karti hai, sab client ke device pe.
 *
 * Server ko sirf chhota JSON summary jaata hai (~2 sec me ek baar) —
 * raw video kabhi network pe nahi jaata. Isse:
 *   1. Privacy behtar hai (video device se bahar nahi jaata)
 *   2. Server free-tier RAM pe koi AI load nahi
 *   3. Bandwidth 50-100x kam lagti hai
 *
 * Requires: <script src="https://cdn.jsdelivr.net/npm/@vladmandic/human/dist/human.min.js"></script>
 * (dashboard.html me already add kiya hua hai)
 */

class HumanTrackerClient {
  constructor({ sessionId, videoEl, wsScheme = "wss", host = window.location.host }) {
    this.sessionId = sessionId;
    this.videoEl = videoEl;
    this.wsUrl = `${wsScheme}://${host}/ws/session/${sessionId}/`;
    this.ws = null;
    this.human = null;
    this.running = false;

    // Rolling window buffer — Human.js har detected frame ka result yahan
    // jama hota hai, phir har WINDOW_MS pe summarize karke server ko bhejte hain
    this.WINDOW_MS = 2000;
    this.windowBuffer = [];
    this.distractedStreak = 0;

    this.onAnalysis = null;   // caller UI-update callback yahan set karega
    this.reconnectDelay = 1000;
  }

  // ── Human.js config: MoodMe/MorphCast ke barabar feature set ─────────
  static humanConfig() {
    return {
      backend: "webgl",              // GPU acceleration browser ke andar
      modelBasePath: "https://cdn.jsdelivr.net/npm/@vladmandic/human/models/",
      face: {
        enabled: true,
        detector: { rotation: true, maxDetected: 1 },   // ek user, single-face tracking
        mesh: { enabled: true },                          // 468-point landmarks (attention/gaze)
        emotion: { enabled: true },                       // 7-class emotion (MoodMe jaisa)
        description: { enabled: true },                   // age + gender + race
        antispoof: { enabled: true },                     // "is this a real face or a photo/screen"
        liveness: { enabled: true },                       // frame-to-frame micro-movement check
      },
      body: { enabled: false },   // hume sirf face-level metrics chahiye — body off = tez FPS
      hand: { enabled: false },
      gesture: { enabled: false },
    };
  }

  async start() {
    // eslint-disable-next-line no-undef
    this.human = new Human.Human(HumanTrackerClient.humanConfig());
    await this.human.load();     // models CDN se download + cache (~15-20MB, ek baar)
    await this.human.warmup();   // pehla inference thoda slow hota hai, warmup se avoid karte hain

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 480, height: 300, facingMode: "user" }, audio: false,
    });
    this.videoEl.srcObject = stream;
    await this.videoEl.play();

    this.running = true;
    this._connect();
    this._detectLoop();
    this.windowTimer = setInterval(() => this._flushWindow(), this.WINDOW_MS);
  }

  stop() {
    this.running = false;
    clearInterval(this.windowTimer);
    if (this.ws) this.ws.close();
    const stream = this.videoEl.srcObject;
    if (stream) stream.getTracks().forEach((t) => t.stop());
  }

  // ── Continuous detection loop — Human.js khud frame-diffing se
  // internally skip karta hai jab kuch change nahi hua, isliye humein
  // manual frame-skip likhne ki zaroorat nahi (jo server-side pipeline
  // me karna padta tha)
  async _detectLoop() {
    if (!this.running) return;
    const result = await this.human.detect(this.videoEl);

    if (result.face && result.face.length > 0) {
      this.windowBuffer.push(this._extractMetrics(result.face[0]));
    }

    requestAnimationFrame(() => this._detectLoop());
  }

  _extractMetrics(face) {
    const emotionTop = (face.emotion && face.emotion[0]) || { emotion: "neutral", score: 0 };

    // Attention: Human.js rotation.angle (yaw/pitch) + gaze bearing
    const yaw = face.rotation?.angle?.yaw ?? 0;
    const pitch = face.rotation?.angle?.pitch ?? 0;
    const attentive = Math.abs(yaw) < 0.35 && Math.abs(pitch) < 0.3;   // radians

    // Engagement score: apna formula, MoodMe ke "valence/activation" jaisa —
    // koi extra model nahi, sirf emotion-probability weighted math
    const engagement = this._computeEngagement(face.emotion || []);

    return {
      emotion: this._capitalize(emotionTop.emotion),
      engagement,
      attentive,
      age: face.age ?? null,
      gender: face.gender ?? null,
      // Human.js: .real (antispoof score), .live (liveness score) — dono 0-1
      livenessScore: ((face.real ?? 1) + (face.live ?? 1)) / 2,
    };
  }

  _computeEngagement(emotionArr) {
    // MoodMe jaisi "engagement" metric ka apna free version:
    // Happy/Surprise ko positive weight, Angry/Sad/Fear/Disgust ko negative,
    // Neutral ko halka positive (baseline attentiveness)
    const WEIGHTS = { happy: 1.0, surprise: 0.5, neutral: 0.3, sad: -0.6, angry: -0.8, fear: -0.7, disgust: -0.6 };
    let score = 50;   // baseline
    for (const e of emotionArr) {
      score += (WEIGHTS[e.emotion] ?? 0) * e.score * 50;
    }
    return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
  }

  _capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  // ── Window flush: buffer ko summarize karke server ko ek chhota JSON bhejo
  _flushWindow() {
    if (this.windowBuffer.length === 0) return;

    const buf = this.windowBuffer;
    this.windowBuffer = [];

    const emotion_counts = {};
    let engagementSum = 0, attentiveCount = 0, ageSum = 0, ageCount = 0, liveSum = 0;
    const genderCounts = {};

    for (const m of buf) {
      emotion_counts[m.emotion] = (emotion_counts[m.emotion] || 0) + 1;
      engagementSum += m.engagement;
      if (m.attentive) attentiveCount++;
      if (m.age) { ageSum += m.age; ageCount++; }
      if (m.gender) genderCounts[m.gender] = (genderCounts[m.gender] || 0) + 1;
      liveSum += m.livenessScore;
    }

    const attentiveRatio = attentiveCount / buf.length;
    if (attentiveRatio < 0.3) {
      this.distractedStreak++;
    } else {
      this.distractedStreak = 0;
    }

    const summary = {
      type: "summary",
      window_seconds: this.WINDOW_MS / 1000,
      emotion_counts,
      avg_engagement: Math.round((engagementSum / buf.length) * 10) / 10,
      attentive_ratio: Math.round(attentiveRatio * 100) / 100,
      age: ageCount ? Math.round((ageSum / ageCount) * 10) / 10 : null,
      gender: Object.keys(genderCounts).length
        ? Object.entries(genderCounts).sort((a, b) => b[1] - a[1])[0][0] : null,
      liveness_score: Math.round((liveSum / buf.length) * 100) / 100,
      distracted: this.distractedStreak >= 2,   // 2 consecutive windows (~4 sec) low-attention
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(summary));
    }

    if (this.onAnalysis) this.onAnalysis(summary);
  }

  _connect() {
    this.ws = new WebSocket(this.wsUrl);
    this.ws.onopen = () => { this.reconnectDelay = 1000; };
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "alert" && this.onServerAlert) this.onServerAlert(data);
    };
    this.ws.onclose = () => {
      if (!this.running) return;   // intentional stop() call — reconnect mat karo
      setTimeout(() => this._connect(), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 15000);
    };
    this.ws.onerror = (err) => console.error("[Focusense] socket error", err);
  }
}

/**
 * Dashboard UI binder — same contract jaisa pehle tracker-client.js me
 * tha, isliye dashboard.html me minimal change lagega.
 */
function bindHumanTrackerToDashboard(client, chart) {
  let lastAlertAt = 0;

  client.onAnalysis = (summary) => {
    const ring = document.getElementById("pulseRing");
    if (ring) {
      const offset = 540 - (summary.avg_engagement / 100) * 540;
      ring.style.strokeDashoffset = offset;
    }

    const total = Object.values(summary.emotion_counts).reduce((a, b) => a + b, 0) || 1;
    Object.entries(summary.emotion_counts).forEach(([name, count]) => {
      const pct = Math.round((count / total) * 100);
      const bar = document.querySelector(`[data-emo="${name}"] .emo-fill`);
      const label = document.querySelector(`[data-emo="${name}"] .emo-pct`);
      if (bar) bar.style.width = `${pct}%`;
      if (label) label.textContent = `${pct}%`;
    });

    if (chart) {
      chart.data.datasets[0].data.push(summary.avg_engagement);
      chart.data.datasets[0].data.shift();
      chart.update("none");
    }

    // Naye demographic badges (age/gender/liveness) — MoodMe/MorphCast jaisa
    const ageBadge = document.getElementById("ageBadge");
    const genderBadge = document.getElementById("genderBadge");
    const liveBadge = document.getElementById("liveBadge");
    if (ageBadge && summary.age) ageBadge.textContent = `~${Math.round(summary.age)} yrs`;
    if (genderBadge && summary.gender) genderBadge.textContent = summary.gender;
    if (liveBadge) {
      liveBadge.textContent = summary.liveness_score >= 0.5 ? "Live ✓" : "Check camera";
      liveBadge.style.color = summary.liveness_score >= 0.5 ? "var(--teal)" : "var(--rose)";
    }

    const now = Date.now();
    if (summary.distracted && now - lastAlertAt > 15000) {
      lastAlertAt = now;
      showAlertToast("Distraction detected", "Focus dhyan se hata hua lag raha hai — thoda break le lo.");
    }
  };
}

function showAlertToast(title, message) {
  const container = document.getElementById("alertContainer");
  if (!container) return;
  const el = document.createElement("div");
  el.className = "alert-toast";
  el.innerHTML = `<span class="dot"></span><div><div style="font-size:13px;font-weight:600;">${title}</div><div style="font-size:12px;color:var(--text-dim);margin-top:2px;">${message}</div></div>`;
  container.prepend(el);
  setTimeout(() => el.remove(), 8000);
}
