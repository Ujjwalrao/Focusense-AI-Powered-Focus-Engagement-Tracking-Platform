import { Link, useLocation } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";

export default function Nav() {
  const { pathname } = useLocation();
  const { user, logout, backendEnabled } = useAuthContext();

  return (
    <header className="relative z-20 w-full">
      <div className="max-w-6xl mx-auto px-6 md:px-8 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <svg width="22" height="22" viewBox="0 0 32 32" className="shrink-0">
            <rect width="32" height="32" rx="7" fill="#1A1D23" />
            <path d="M3 16 L9 16 L12 8 L16 24 L20 12 L23 16 L29 16" fill="none" stroke="#FFB020" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-display italic text-2xl tracking-tight text-paper">Focusense</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 channel-tag text-dim">
          <a href="/#channels" className="hover:text-paper transition-colors">Channels</a>
          <a href="/#how" className="hover:text-paper transition-colors">How it reads</a>
          {backendEnabled && (
            <Link to="/history" className={`hover:text-paper transition-colors ${pathname === "/history" ? "text-paper" : ""}`}>History</Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {backendEnabled && user && (
            <button onClick={logout} className="channel-tag text-dim hover:text-paper transition-colors">
              {user} · Sign out
            </button>
          )}
          {backendEnabled && !user && (
            <Link to="/login" className="channel-tag text-dim hover:text-paper transition-colors">Sign in</Link>
          )}
          <Link
            to="/app"
            className="channel-tag px-4 py-2 rounded-full border border-amber/40 text-amber hover:bg-amber hover:text-graphite transition-colors"
          >
            {pathname === "/app" ? "Live" : "Launch demo"}
          </Link>
        </div>
      </div>
    </header>
  );
}
