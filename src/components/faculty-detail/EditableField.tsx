"use client";

import { useEffect, useState, type ReactNode } from "react";
import { displayValue } from "@/lib/format";

// One profile field. In edit mode an editable field shows a pencil; clicking it
// reveals the input(s) for just that field. Read-only fields never show a
// pencil. Leaving edit mode collapses every field back to its value.

const pencilButtonStyle: React.CSSProperties = {
  marginLeft: 6,
  padding: 2,
  border: "none",
  background: "transparent",
  cursor: "pointer",
  color: "#0057b8",
  verticalAlign: "middle",
  lineHeight: 0,
};

export default function EditableField({
  label,
  value,
  editing,
  editable,
  children,
}: {
  label: string;
  value: string | null;
  editing: boolean;
  editable: boolean;
  /** The input control(s), rendered when the field is activated for editing. */
  children?: ReactNode;
}) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    if (!editing) setActive(false);
  }, [editing]);

  const showInput = editing && editable && active;

  return (
    <div className="faculty-about-field">
      <div className="faculty-about-field-label">
        <span>{label}</span>
        {editing && editable && !active && (
          <button
            type="button"
            style={pencilButtonStyle}
            aria-label={`Edit ${label}`}
            title={`Edit ${label}`}
            onClick={() => setActive(true)}
          >
            <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" fill="currentColor">
              <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10ZM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5Z" />
            </svg>
          </button>
        )}
      </div>
      <div className="faculty-about-field-value">
        {showInput ? children : displayValue(value)}
      </div>
    </div>
  );
}
