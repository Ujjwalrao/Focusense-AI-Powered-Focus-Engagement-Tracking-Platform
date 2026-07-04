import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";

export default function useAuth() {
  const [user, setUser] = useState(null);       // null = signed out, string = username
  const [loading, setLoading] = useState(api.enabled);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!api.enabled) { setLoading(false); return; }
    try {
      await api.primeCsrf();               // csrftoken cookie set karta hai
      const res = await api.me();
      setUser(res.authenticated ? res.username : null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = useCallback(async (username, password) => {
    setError(null);
    try {
      const res = await api.login(username, password);
      setUser(res.username);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }, []);

  const signup = useCallback(async (username, password) => {
    setError(null);
    try {
      const res = await api.signup(username, password);
      setUser(res.username);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try { await api.logout(); } finally { setUser(null); }
  }, []);

  return { user, loading, error, login, signup, logout, backendEnabled: api.enabled };
}
