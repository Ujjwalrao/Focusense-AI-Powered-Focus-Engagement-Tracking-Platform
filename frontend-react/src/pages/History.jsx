import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Nav from "../components/Nav";
import { useAuthContext } from "../context/AuthContext";
import { api } from "../lib/api";

export default function History() {
  const { user, loading: authLoading, backendEnabled } = useAuthContext();
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    api.history().then((res) => setSessions(res.sessions)).catch((e) => setError(e.message));
  }, [user]);

  return (
    <div className="min-h-screen bg-graphite text-paper grid-texture">
      <Nav />
      <main className="max-w-4xl mx-auto px-6 md:px-8 pt-10 pb-20">
        <div className="channel-tag text-amber mb-3">Past sessions</div>
        <h1 className="font-display italic text-4xl mb-8">Session history.</h1>

        {!backendEnabled && (
          <div className="rounded-xl border border-cyan/20 bg-cyan-soft p-5 text-sm text-dim">
            No backend connected — history needs a Focusense backend (set <code className="font-mono-ui text-paper">VITE_API_URL</code>).
          </div>
        )}

        {backendEnabled && !authLoading && !user && (
          <div className="rounded-xl border border-white/10 bg-graphite-soft/60 p-5 text-sm text-dim">
            <Link to="/login" className="text-amber hover:underline">Sign in</Link> to see your past sessions.
          </div>
        )}

        {error && <div className="text-sm text-rose">{error}</div>}

        {sessions && (
          <div className="rounded-2xl border border-white/[0.08] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="channel-tag text-dim text-left bg-graphite-soft/60">
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Duration</th>
                  <th className="p-3.5">Engagement</th>
                  <th className="p-3.5">Dominant emotion</th>
                  <th className="p-3.5">Distractions</th>
                  <th className="p-3.5">Report</th>
                </tr>
              </thead>
              <tbody>
                {sessions.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-dim">No sessions yet — start one from the live dashboard.</td></tr>
                )}
                {sessions.map((s, i) => (
                  <motion.tr
                    key={s.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-t border-white/[0.06]"
                  >
                    <td className="p-3.5 font-mono-ui text-xs">{new Date(s.started_at).toLocaleString()}</td>
                    <td className="p-3.5 font-mono-ui text-xs">{s.duration}</td>
                    <td className="p-3.5 font-mono-ui text-xs">{s.avg_engagement_score}%</td>
                    <td className="p-3.5">{s.dominant_emotion || "—"}</td>
                    <td className="p-3.5 font-mono-ui text-xs">{s.distraction_count}</td>
                    <td className="p-3.5">
                      {s.has_report ? (
                        <a href={api.reportUrl(s.id)} className="text-amber hover:underline" target="_blank" rel="noreferrer">
                          Download
                        </a>
                      ) : <span className="text-dim">—</span>}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
