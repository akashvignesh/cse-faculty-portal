"use client";

import { useState } from "react";
import { getInitials } from "@/lib/format";

interface FacultyPhotoProps {
  /** person number (preferred) or userid — the photo route resolves either. */
  routeId: string;
  name: string;
}

/**
 * Faculty photo from /api/v1/faculty/{id}/photo, with a graceful fallback to
 * name initials when the person has no photo (route 404 -> onError) or no id.
 */
export default function FacultyPhoto({ routeId, name }: FacultyPhotoProps) {
  const [failed, setFailed] = useState(false);

  if (!routeId || failed) {
    return <div className="faculty-summary-photo">{getInitials(name)}</div>;
  }

  return (
    // Dynamic DB blob endpoint — next/image can't optimize it, so a plain img.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="faculty-summary-photo"
      style={{ objectFit: "cover" }}
      src={`/api/v1/faculty/${encodeURIComponent(routeId)}/photo`}
      alt={name}
      onError={() => setFailed(true)}
    />
  );
}
