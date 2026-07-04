import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Nav from "../components/Nav";
import SignalWave from "../components/SignalWave";
import ChannelCard from "../components/ChannelCard";

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

export default function Landing() {
  return (
    <div className="min-h-screen bg-graphite text-paper grid-texture">
      <Nav />

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative max-w-6xl mx-auto px-6 md:px-8 pt-10 md:pt-16 pb-20">
        <motion.div initial="hidden" animate="show" variants={fadeUp} className="max-w-3xl">
          <div className="channel-tag text-amber mb-6 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse" />
            On-device · zero video ever leaves the browser
          </div>
          <h1 className="font-display italic text-[15vw] sm:text-6xl md:text-7xl leading-[0.98] tracking-tight">
            Read the signal
            <br />
            behind attention.
          </h1>
          <p className="mt-7 text-lg text-dim max-w-xl leading-relaxed">
            Focusense turns a webcam into an instrument — reading emotion, focus,
            and presence in real time, entirely inside the visitor's own browser.
            No frame ever touches a server.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              to="/app"
              className="channel-tag px-6 py-3.5 rounded-full bg-amber text-graphite hover:bg-paper transition-colors"
            >
              Launch live demo →
            </Link>
            <a href="#how" className="channel-tag px-6 py-3.5 rounded-full border border-white/15 text-paper hover:border-white/40 transition-colors">
              How it reads a face
            </a>
          </div>
        </motion.div>

        {/* Signature element: the live ambient Signal Wave */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.3 }}
          className="mt-16 rounded-2xl border border-white/[0.08] bg-graphite-soft/50 p-6 md:p-8"
        >
          <div className="flex items-center justify-between mb-2 channel-tag text-dim">
            <span>SIG.OUT — composite attention trace</span>
            <span className="flex items-center gap-1.5 text-cyan"><span className="w-1.5 h-1.5 rounded-full bg-cyan" /> reading</span>
          </div>
          <SignalWave value={null} height={180} />
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/[0.06]">
            {[
              ["4", "signal channels"],
              ["<80ms", "inference latency"],
              ["0", "servers touching video"],
              ["$0", "to run at any scale"],
            ].map(([num, label]) => (
              <div key={label}>
                <div className="font-mono-ui text-xl text-paper">{num}</div>
                <div className="channel-tag text-dim mt-1">{label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── 4 CHANNELS ───────────────────────────────────────────────── */}
      <section id="channels" className="max-w-6xl mx-auto px-6 md:px-8 py-20">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="max-w-2xl mb-12">
          <div className="channel-tag text-cyan mb-4">Four channels, one face</div>
          <h2 className="font-display italic text-4xl md:text-5xl leading-tight">
            Everything reads simultaneously, like a real instrument panel.
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-5">
          <ChannelCard
            tag="CH.01 — EMOTION"
            title="Seven-state emotional read"
            description="Happy, sad, angry, fear, disgust, surprise, neutral — classified frame by frame and rolled into a single engagement score."
            metric="7"
            metricLabel="classes"
            color="amber"
          />
          <ChannelCard
            tag="CH.02 — ATTENTION"
            title="Head pose & gaze tracking"
            description="468-point facial mesh tracks yaw, pitch, and gaze bearing to tell whether a visitor is actually looking, or just present."
            metric="468"
            metricLabel="landmarks"
            color="cyan"
          />
          <ChannelCard
            tag="CH.03 — IDENTITY"
            title="Age & gender estimation"
            description="Lightweight demographic inference for aggregate analytics — never tied to a name, never stored as an image."
            metric="±3.5yr"
            metricLabel="typical margin"
            color="amber"
          />
          <ChannelCard
            tag="CH.04 — LIVENESS"
            title="Anti-spoof & presence check"
            description="Micro-movement and depth heuristics catch a printed photo or a replayed video before it's counted as a real visitor."
            metric="2"
            metricLabel="spoof checks"
            color="rose"
          />
        </div>
      </section>

      {/* ── HOW IT WORKS (real 3-step sequence — numbering earned here) ─ */}
      <section id="how" className="max-w-6xl mx-auto px-6 md:px-8 py-20 border-t border-white/[0.06]">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="max-w-2xl mb-14">
          <div className="channel-tag text-amber mb-4">The signal path</div>
          <h2 className="font-display italic text-4xl md:text-5xl leading-tight">
            The camera never leaves the glass it's behind.
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              n: "01",
              title: "Capture, locally",
              body: "getUserMedia opens the webcam. Frames stay in browser memory — nothing is uploaded, recorded, or cached anywhere.",
            },
            {
              n: "02",
              title: "Infer, on-device",
              body: "A WebGL-accelerated model reads emotion, pose, and liveness right on the visitor's GPU, ~15 times a second.",
            },
            {
              n: "03",
              title: "Summarize, then sync",
              body: "Only a small JSON summary — numbers, never pixels — leaves the browser every two seconds, for dashboards and reports.",
            },
          ].map((step) => (
            <motion.div key={step.n} initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}>
              <div className="font-mono-ui text-sm text-dim mb-3">{step.n}</div>
              <h3 className="font-display italic text-2xl mb-2">{step.title}</h3>
              <p className="text-sm text-dim leading-relaxed">{step.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 md:px-8 py-24 border-t border-white/[0.06]">
        <motion.div
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}
          className="rounded-3xl border border-amber/20 bg-gradient-to-br from-amber-soft to-transparent p-10 md:p-16 text-center"
        >
          <h2 className="font-display italic text-4xl md:text-6xl leading-tight max-w-2xl mx-auto">
            Point a camera at it. Watch the signal move.
          </h2>
          <Link
            to="/app"
            className="inline-block mt-8 channel-tag px-7 py-4 rounded-full bg-amber text-graphite hover:bg-paper transition-colors"
          >
            Launch live demo →
          </Link>
        </motion.div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 md:px-8 py-10 border-t border-white/[0.06] flex flex-col sm:flex-row justify-between gap-4 channel-tag text-dim">
        <span>Focusense — an open-source engagement instrument.</span>
        <span>Built on Human.js, MIT licensed.</span>
      </footer>
    </div>
  );
}
