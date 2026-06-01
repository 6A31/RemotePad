import { useState, FormEvent, useEffect, type MouseEvent } from "react";
import type { HostInfo } from "@remotepad/protocol";
import { currentOrigin, fetchHostInfo, hostLabel, normalizeOrigin } from "../lib/hostInfo";
import {
  listRecentHosts,
  rememberHost,
  removeHost,
  formatSavedHostAddress,
  getLastUsername,
  type SavedHost,
} from "../lib/hostHistory";

interface LoginViewProps {
  onLogin: (token: string) => void;
}

export function LoginView({ onLogin }: LoginViewProps) {
  const origin = currentOrigin();
  const [username, setUsername] = useState(() => getLastUsername(origin));
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hostInfo, setHostInfo] = useState<HostInfo | null>(null);
  const [recentHosts, setRecentHosts] = useState<SavedHost[]>([]);
  const [otherHost, setOtherHost] = useState("");

  useEffect(() => {
    void fetchHostInfo().then((info) => {
      if (info) {
        setHostInfo(info);
        rememberHost(origin, info.hostname);
      }
      setRecentHosts(listRecentHosts(origin));
    });
  }, [origin]);

  function refreshRecent() {
    setRecentHosts(listRecentHosts(origin));
  }

  function goToHost(targetOrigin: string) {
    if (targetOrigin === origin) return;
    window.location.href = targetOrigin;
  }

  function handleOtherHostSubmit(e: FormEvent) {
    e.preventDefault();
    const target = normalizeOrigin(otherHost);
    if (!target) {
      setError("Enter an IP or address like 192.168.1.10");
      return;
    }
    if (target === origin) {
      setError("You are already on that PC");
      return;
    }
    goToHost(target);
  }

  function handleRemoveHost(entry: SavedHost, e: MouseEvent) {
    e.stopPropagation();
    removeHost(entry.origin);
    refreshRecent();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Wrong username or password");
      }

      const { token } = await res.json();
      rememberHost(origin, hostInfo?.hostname ?? origin, username);
      onLogin(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-layout">
        <div className="login-main">
          <div className="login-card">
            <h1>RemotePad</h1>

            {hostInfo && (
              <div className="host-info">
                <span className="host-info-label">This PC</span>
                <strong>{hostInfo.hostname}</strong>
                <span className="host-info-address">{hostLabel(origin)}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <label>
                Username
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  placeholder="Username"
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </label>
              {error && <p className="error">{error}</p>}
              <button type="submit" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>
        </div>

        <aside className="login-sidebar">
          <div className="login-card">
            <h2>Other PCs</h2>

            {recentHosts.length > 0 ? (
              <div className="host-history">
                <span className="host-history-label">Recent</span>
                <ul>
                  {recentHosts.map((entry) => (
                    <li key={entry.origin}>
                      <button
                        type="button"
                        className="host-history-item"
                        onClick={() => goToHost(entry.origin)}
                      >
                        <span className="host-history-name">{entry.hostname}</span>
                        <span className="host-history-address">
                          {formatSavedHostAddress(entry.origin)}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="host-history-remove"
                        aria-label={`Remove ${entry.hostname}`}
                        onClick={(e) => handleRemoveHost(entry, e)}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="login-sidebar-empty">Recent PCs show up here after you visit them.</p>
            )}

            <form className="other-host-form" onSubmit={handleOtherHostSubmit}>
              <label>
                Go to address
                <div className="other-host-row">
                  <input
                    type="text"
                    value={otherHost}
                    onChange={(e) => setOtherHost(e.target.value)}
                    placeholder="192.168.1.10"
                    inputMode="decimal"
                  />
                  <button type="submit">Go</button>
                </div>
              </label>
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}
