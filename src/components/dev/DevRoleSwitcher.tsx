"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/components/auth/AuthProvider";
import type { Role } from "@/lib/permissions";

// Role-testing widget for exercising RBAC before UB SSO lands — in local dev
// and on a deployed TEST server (set AUTH_DEV_SWITCHER=1). When a test-access
// key is configured (AUTH_DEV_SWITCHER_SECRET), it is required here so the
// deploy isn't open to anyone. Applies via the cfp-dev-user cookie + reload.

const SECRET_KEY = "cfp-dev-switcher-secret";

const panelStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 12,
  right: 12,
  zIndex: 1000,
  background: "#1e2a38",
  color: "#fff",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 12,
  boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
  display: "flex",
  flexDirection: "column",
  gap: 6,
  minWidth: 200,
};

const QUICK_ROLES: Role[] = ["chair", "staff", "faculty", "viewer"];

export default function DevRoleSwitcher() {
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const [userid, setUserid] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Remember the test-access key for the session so it isn't re-typed.
  useEffect(() => {
    try {
      setSecret(sessionStorage.getItem(SECRET_KEY) ?? "");
    } catch {
      /* sessionStorage unavailable — ignore */
    }
  }, []);

  if (!session?.devSwitcher.enabled) return null;
  const needsSecret = Boolean(session.devSwitcher.requiresSecret);

  async function impersonate(targetUserid: string, targetRole: Role | "") {
    const uid = (targetUserid || session?.userid || "").trim();
    if (!uid) return;
    if (needsSecret && !secret.trim()) {
      setError("Enter the test-access key first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/dev/impersonate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(needsSecret ? { "x-dev-switcher-secret": secret.trim() } : {}),
        },
        body: JSON.stringify({ userid: uid, ...(targetRole ? { role: targetRole } : {}) }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? `Failed (${response.status})`);
      }
      if (needsSecret) {
        try {
          sessionStorage.setItem(SECRET_KEY, secret.trim());
        } catch {
          /* ignore */
        }
      }
      window.location.reload();
    } catch (cause) {
      setBusy(false);
      setError(cause instanceof Error ? cause.message : "Failed to impersonate");
    }
  }

  async function reset() {
    setBusy(true);
    setError(null);
    try {
      await fetch("/api/dev/impersonate", { method: "DELETE" });
      window.location.reload();
    } catch {
      setBusy(false);
      setError("Failed to reset");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        style={{ ...panelStyle, cursor: "pointer", minWidth: 0 }}
        onClick={() => setOpen(true)}
        title="Role switcher (test mode)"
      >
        DEV: {session.userid} ({session.role})
      </button>
    );
  }

  const inputStyle: React.CSSProperties = { color: "#000", padding: "2px 4px", borderRadius: 4 };

  return (
    <div style={panelStyle} role="dialog" aria-label="Role switcher (test mode)">
      <strong>Role switcher (test)</strong>

      {needsSecret && (
        <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          test-access key
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            style={inputStyle}
            placeholder="required"
          />
        </label>
      )}

      {/* One-click role testing: forces the role on the userid below (or the
          current user). For faculty own-profile testing, type a real faculty
          userid first. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ opacity: 0.8 }}>quick test as…</span>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {QUICK_ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => impersonate(userid, r)}
              disabled={busy}
              style={{ textTransform: "capitalize" }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        userid
        <input
          value={userid}
          placeholder={session.userid}
          maxLength={8}
          onChange={(e) => setUserid(e.target.value)}
          style={inputStyle}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        role
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role | "")}
          style={inputStyle}
        >
          <option value="">(derive from DB/mock)</option>
          {session.devSwitcher.roles.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      {error ? <span style={{ color: "#ffb4b4" }}>{error}</span> : null}

      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" onClick={() => impersonate(userid, role)} disabled={busy}>
          Apply
        </button>
        <button type="button" onClick={reset} disabled={busy}>
          Reset
        </button>
        <button type="button" onClick={() => setOpen(false)} disabled={busy}>
          Close
        </button>
      </div>
    </div>
  );
}
