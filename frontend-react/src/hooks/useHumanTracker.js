import { useRef, useState, useCallback } from "react";

const WEIGHTS = { happy: 1.0, surprise: 0.5, neutral: 0.3, sad: -0.6, angry: -0.8, fear: -0.7, disgust: -0.6 };
const WINDOW_MS = 2000;

function computeEngagement(emotionArr) {
  let score = 50;
  for (const e of emotionArr) score += (WEIGHTS[e.emotion] ?? 0) * e.score * 50;
  return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * useHumanTracker — Focusense ka poora client-side AI engine, ek React
 * hook ke roop me. Human.js load karta hai, webcam kholta hai, aur har
 * frame ka result ek "live" object me expose karta hai jo dashboard
 * seedha render kar sakta hai. Har WINDOW_MS pe ek summarized snapshot
 * bhi deta hai (onWindow callback se) — WebSocket ko yeh bhejne ke liye.
 */
export default function useHumanTracker() {
  const [status, setStatus] = useState("idle"); // idle | loading | running | error
  const [live, setLive] = useState(null);        // latest single-frame reading
  const [error, setError] = useState(null);

  const humanRef = useRef(null);
  const videoRef = useRef(null);
  const runningRef = useRef(false);
  const bufferRef = useRef([]);
  const windowTimerRef = useRef(null);
  const onWindowRef = useRef(null);

  const start = useCallback(async (videoEl, onWindow) => {
    videoRef.current = videoEl;
    onWindowRef.current = onWindow;
    setStatus("loading");
    setError(null);

    try {
      // eslint-disable-next-line no-undef
      const human = new Human.Human({
        backend: "webgl",
        modelBasePath: "https://cdn.jsdelivr.net/npm/@vladmandic/human/models/",
        face: {
          enabled: true,
          detector: { rotation: true, maxDetected: 1 },
          mesh: { enabled: true },
          emotion: { enabled: true },
          description: { enabled: true },
          antispoof: { enabled: true },
          liveness: { enabled: true },
        },
        body: { enabled: false },
        hand: { enabled: false },
        gesture: { enabled: false },
      });
      humanRef.current = human;
      await human.load();
      await human.warmup();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 300, facingMode: "user" },
        audio: false,
      });
      videoEl.srcObject = stream;
      await videoEl.play();

      runningRef.current = true;
      setStatus("running");

      windowTimerRef.current = setInterval(flushWindow, WINDOW_MS);
      detectLoop();
    } catch (err) {
      console.error(err);
      setError(err.message || "Camera access denied");
      setStatus("error");
    }
  }, []);

  async function detectLoop() {
    if (!runningRef.current) return;
    const human = humanRef.current;
    const result = await human.detect(videoRef.current);

    if (result.face?.length) {
      const face = result.face[0];
      const emotionTop = face.emotion?.[0] || { emotion: "neutral", score: 0 };
      const yaw = face.rotation?.angle?.yaw ?? 0;
      const pitch = face.rotation?.angle?.pitch ?? 0;

      const reading = {
        emotion: capitalize(emotionTop.emotion),
        engagement: computeEngagement(face.emotion || []),
        attentive: Math.abs(yaw) < 0.35 && Math.abs(pitch) < 0.3,
        age: face.age ?? null,
        gender: face.gender ?? null,
        livenessScore: ((face.real ?? 1) + (face.live ?? 1)) / 2,
        emotionProbs: Object.fromEntries((face.emotion || []).map((e) => [capitalize(e.emotion), e.score])),
      };

      setLive(reading);
      bufferRef.current.push(reading);
    } else {
      setLive((prev) => (prev ? { ...prev, faceFound: false } : null));
    }

    requestAnimationFrame(detectLoop);
  }

  function flushWindow() {
    const buf = bufferRef.current;
    if (!buf.length) return;
    bufferRef.current = [];

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

    const summary = {
      type: "summary",
      window_seconds: WINDOW_MS / 1000,
      emotion_counts,
      avg_engagement: Math.round((engagementSum / buf.length) * 10) / 10,
      attentive_ratio: Math.round((attentiveCount / buf.length) * 100) / 100,
      age: ageCount ? Math.round((ageSum / ageCount) * 10) / 10 : null,
      gender: Object.keys(genderCounts).length
        ? Object.entries(genderCounts).sort((a, b) => b[1] - a[1])[0][0] : null,
      liveness_score: Math.round((liveSum / buf.length) * 100) / 100,
      distracted: attentiveCount / buf.length < 0.3,
    };

    onWindowRef.current?.(summary);
  }

  const stop = useCallback(() => {
    runningRef.current = false;
    clearInterval(windowTimerRef.current);
    const stream = videoRef.current?.srcObject;
    stream?.getTracks().forEach((t) => t.stop());
    setStatus("idle");
    setLive(null);
  }, []);

  return { status, live, error, start, stop };
}
