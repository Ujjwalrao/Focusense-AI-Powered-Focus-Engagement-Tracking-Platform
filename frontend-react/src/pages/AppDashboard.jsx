import { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Nav from "../components/Nav";
import SignalWave from "../components/SignalWave";
import useHumanTracker from "../hooks/useHumanTracker";
import useBackendSocket from "../hooks/useBackendSocket";

const EMOTION_ORDER = ["Happy", "Neutral", "Surprise", "Sad", "Fear", "Angry", "Disgust"];

function genSessionId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

export default function AppDashboard() {
  const videoRef = useRef(null);
  const [sessionId] = useState(genSessionId);
  const [toast, setToast] = useState(null);
  const tracker = useHumanTracker();
  const backend = useBackendSocket();

  const handleWindow = useCallback((summary) => {
    backend.send(summary);
    if (summary.distracted) {
      setToast({ title: "Attention drifted", body: "Gaze moved away from the frame for a while." });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (backend.lastAlert) {
      setToast({ title: "Server flag", body: backend.lastAlert.message });
    }
  }, [backend.lastAlert]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleStart() {
    backend.connect(sessionId);
    await tracker.start(videoRef.current, handleWindow);
  }

  function handleStop() {
    tracker.stop();
    backend.disconnect();
  }

  const live = tracker.live;

  return (
    <div className="min-h-screen bg-graphite text-paper grid-texture">
      <Nav />

      <main className="max-w-6xl mx-auto px-6 md:px-8 pb-24">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <div className="channel-tag text-amber mb-2">Session {sessionId}</div>
            <h1 className="font-display italic text-4xl md:text-5xl">Live reading</h1>
          </div>

          <button
            onClick={tracker.status === "running" ? handleStop : handleStart}
            disabled={tracker.status === "loading"}
            className="channel-tag px-6 py-3 rounded-full bg-amber text-graphite hover:bg-paper transition-colors disabled:opacity-50"
          >
            {tracker.status === "running" ? "Stop session" : tracker.status === "loading" ? "Loading model…" : "Start session"}
          </button>
        </div>

        {tracker.status === "error" && (
          <div className="mb-6 rounded-xl border border-rose/30 bg-rose-soft p-4 text-sm text-rose">
            Camera access failed: {tracker.error}. Allow camera permission and try again.
          </div>
        )}

        {!backend.enabled && (
          <div className="mb-6 rounded-xl border border-cyan/20 bg-cyan-soft p-4 text-sm text-dim">
            <span className="text-cyan channel-tag">Standalone mode</span> — no backend connected, this session runs entirely in your browser and nothing is saved. Set <code className="font-mono-ui text-paper">VITE_WS_URL</code> to connect a Focusense backend for history and PDF reports.
          </div>
        )}

        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-5">
          {/* Video + waveform */}
          <div className="rounded-2xl border border-white/[0.08] bg-graphite-soft/60 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="channel-tag text-dim">Camera feed</span>
              <span className={`channel-tag flex items-center gap-1.5 ${tracker.status === "running" ? "text-cyan" : "text-dim"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${tracker.status === "running" ? "bg-cyan animate-pulse" : "bg-dim"}`} />
                {tracker.status === "running" ? "reading" : tracker.status}
              </span>
            </div>

            <div className="relative rounded-xl overflow-hidden bg-black/40" style={{ aspectRatio: "16/10" }}>
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
              {tracker.status !== "running" && (
                <div className="absolute inset-0 flex items-center justify-center text-dim text-sm">
                  Camera preview appears here
                </div>
              )}
            </div>

            <div className="mt-5">
              <div className="channel-tag text-dim mb-2">SIG.OUT — engagement trace</div>
              <SignalWave value={live?.engagement ?? null} height={120} />
            </div>
          </div>

          {/* Readouts */}
          <div className="flex flex-col gap-5">
            <div className="rounded-2xl border border-white/[0.08] bg-graphite-soft/60 p-5">
              <div className="channel-tag text-dim mb-4">CH.01 — Emotion distribution</div>
              <div className="space-y-2.5">
                {EMOTION_ORDER.map((name) => {
                  const pct = live?.emotionProbs?.[name] ? Math.round(live.emotionProbs[name] * 100) : 0;
                  return (
                    <div key={name} className="flex items-center gap-3">
                      <span className="w-16 text-xs text-dim">{name}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <motion.div
                          className="h-full bg-amber rounded-full"
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.4 }}
                        />
                      </div>
                      <span className="w-9 text-right font-mono-ui text-xs text-dim">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="rounded-2xl border border-white/[0.08] bg-graphite-soft/60 p-5">
                <div className="channel-tag text-dim mb-2">CH.02 — Attention</div>
                <div className="font-display italic text-3xl">
                  {live ? (live.attentive ? "Focused" : "Drifted") : "—"}
                </div>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-graphite-soft/60 p-5">
                <div className="channel-tag text-dim mb-2">CH.04 — Liveness</div>
                <div className="font-display italic text-3xl">
                  {live ? (live.livenessScore >= 0.5 ? "Real" : "Check") : "—"}
                </div>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-graphite-soft/60 p-5">
                <div className="channel-tag text-dim mb-2">CH.03 — Age</div>
                <div className="font-mono-ui text-3xl">{live?.age ? `~${Math.round(live.age)}` : "—"}</div>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-graphite-soft/60 p-5">
                <div className="channel-tag text-dim mb-2">CH.03 — Gender</div>
                <div className="font-mono-ui text-3xl capitalize">{live?.gender ?? "—"}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber/25 bg-amber-soft p-5">
              <div className="channel-tag text-amber mb-2">Engagement score</div>
              <div className="font-display italic text-5xl">{live ? live.engagement.toFixed(1) : "—"}</div>
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className="fixed bottom-6 left-1/2 z-30 rounded-xl border border-rose/30 bg-graphite-soft/95 backdrop-blur px-5 py-4 max-w-sm shadow-2xl"
          >
            <div className="flex gap-3">
              <span className="w-2 h-2 mt-1.5 rounded-full bg-rose shrink-0" />
              <div>
                <div className="text-sm font-medium">{toast.title}</div>
                <div className="text-xs text-dim mt-1">{toast.body}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
