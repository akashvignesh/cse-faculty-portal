"use client";

import type { Faculty } from "@/types/faculty";
import LeaveEditor from "./LeaveEditor";

export default function LeaveTab({ faculty }: { faculty: Faculty }) {
  return (
    <div className="faculty-secondary-section">
      <div className="faculty-preference-heading">
        <h2>Leave</h2>
      </div>
      <LeaveEditor key={`leave-${faculty.userid}`} faculty={faculty} />
    </div>
  );
}
