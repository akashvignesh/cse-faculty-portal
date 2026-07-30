"use client";

import type { ProfileEditState } from "./useProfileEdit";

// Confirmation popup shown when Apply is clicked: lists every field that will
// change, from → to, so the editor confirms exactly what they're updating.

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1100,
  padding: 16,
};

const panelStyle: React.CSSProperties = {
  background: "#fff",
  color: "#1e2a38",
  borderRadius: 8,
  padding: 20,
  maxWidth: 620,
  width: "100%",
  maxHeight: "85vh",
  overflowY: "auto",
  boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
};

const cellStyle: React.CSSProperties = {
  padding: "6px 8px",
  borderBottom: "1px solid #e2e8ee",
  verticalAlign: "top",
  fontSize: 14,
};

export default function ProfileChangeReview({ profileEdit }: { profileEdit: ProfileEditState }) {
  if (!profileEdit.isReviewing) return null;

  return (
    <div style={overlayStyle} role="presentation" onClick={profileEdit.cancelReview}>
      <div
        style={panelStyle}
        role="dialog"
        aria-modal="true"
        aria-label="Review profile changes"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0 }}>Review changes</h3>
        <p>You are about to update the following {profileEdit.changes.length} field(s):</p>

        <table style={{ width: "100%", borderCollapse: "collapse", margin: "8px 0 16px" }}>
          <thead>
            <tr>
              <th style={{ ...cellStyle, textAlign: "left", fontWeight: 600 }}>Field</th>
              <th style={{ ...cellStyle, textAlign: "left", fontWeight: 600 }}>Current</th>
              <th style={{ ...cellStyle, textAlign: "left", fontWeight: 600 }}>New</th>
            </tr>
          </thead>
          <tbody>
            {profileEdit.changes.map((change) => (
              <tr key={change.label}>
                <td style={{ ...cellStyle, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {change.label}
                </td>
                <td style={{ ...cellStyle, color: "#8a1f1f", textDecoration: "line-through" }}>
                  {change.from}
                </td>
                <td style={{ ...cellStyle, color: "#0a6b2e" }}>{change.to}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {profileEdit.error && (
          <p className="cp-save-message cp-save-message-error" role="alert">
            {profileEdit.error}
          </p>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            type="button"
            className="cp-save-btn"
            style={{ background: "#6b7785" }}
            onClick={profileEdit.cancelReview}
            disabled={profileEdit.saving}
          >
            Keep Editing
          </button>
          <button
            type="button"
            className="cp-save-btn"
            onClick={profileEdit.confirmSave}
            disabled={profileEdit.saving}
          >
            {profileEdit.saving ? "Saving…" : "Confirm & Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
