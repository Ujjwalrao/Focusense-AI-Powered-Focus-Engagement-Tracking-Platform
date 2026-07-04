import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Nav from "../components/Nav";
import { useAuthContext } from "../context/AuthContext";

export default function Login() {
  const { login, error, backendEnabled } = useAuthContext();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    const ok = await login(form.username, form.password);
    setBusy(false);
    if (ok) navigate("/app");
  }

  return (
    <div className="min-h-screen bg-graphite text-paper grid-texture">
      <Nav />
      <main className="max-w-md mx-auto px-6 pt-16">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="channel-tag text-amber mb-3">Sign in</div>
          <h1 className="font-display italic text-4xl mb-8">Welcome back.</h1>

          {!backendEnabled && (
            <div className="mb-6 rounded-xl border border-cyan/20 bg-cyan-soft p-4 text-sm text-dim">
              No backend connected (<code className="font-mono-ui text-paper">VITE_API_URL</code> not set) — login is unavailable, but you can still try <Link to="/app" className="text-cyan underline">the standalone demo</Link>.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="channel-tag text-dim">Username</label>
              <input
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full mt-1.5 bg-graphite-soft border border-white/10 rounded-lg px-3.5 py-2.5 text-sm focus:border-amber/50 outline-none"
              />
            </div>
            <div>
              <label className="channel-tag text-dim">Password</label>
              <input
                required
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full mt-1.5 bg-graphite-soft border border-white/10 rounded-lg px-3.5 py-2.5 text-sm focus:border-amber/50 outline-none"
              />
            </div>

            {error && <div className="text-sm text-rose">{error}</div>}

            <button
              type="submit"
              disabled={busy || !backendEnabled}
              className="w-full channel-tag py-3 rounded-full bg-amber text-graphite hover:bg-paper transition-colors disabled:opacity-40"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-sm text-dim mt-6">
            New here?{" "}
            <Link to="/signup" className="text-amber hover:underline">Create an account</Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
