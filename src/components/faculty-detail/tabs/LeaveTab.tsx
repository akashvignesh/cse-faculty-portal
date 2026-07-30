"use client";

import type { Faculty } from "@/types/faculty";
import LeaveEditor from "./LeaveEditor";

export default function LeaveTab({
  faculty,
  editing = false,
}: {
  faculty: Faculty;
  /** Whether the page is in profile edit mode; leave is read-only otherwise. */
  editing?: boolean;
}) {
  return (
    <div className="faculty-secondary-section">
      <div className="faculty-preference-heading">
        <h2>Leave</h2>
      </div>
      <LeaveEditor key={`leave-${faculty.userid}`} faculty={faculty} editing={editing} />
    </div>
  );
}
