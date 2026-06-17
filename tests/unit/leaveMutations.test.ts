import { describe, expect, it } from "vitest";
import { computeLeaveMutations, type LeaveDraft } from "@/services/faculty/leaveService";

function draft(over: Partial<LeaveDraft> = {}): LeaveDraft {
  return {
    leaveType: "Paid Leave (PL)",
    startDate: "2025-01-01",
    endDate: "2025-06-30",
    location: "Buffalo",
    reason: "",
    backupFacultyPersonNumber: "",
    ...over,
  };
}

describe("computeLeaveMutations", () => {
  it("treats a row without a leaveId as a create", () => {
    const result = computeLeaveMutations([draft()], []);
    expect(result.creates).toHaveLength(1);
    expect(result.edits).toHaveLength(0);
    expect(result.removes).toHaveLength(0);
  });

  it("edits an existing row only when a field changed", () => {
    const baseline = [draft({ leaveId: "10" })];
    const unchanged = computeLeaveMutations([draft({ leaveId: "10" })], baseline);
    expect(unchanged.edits).toHaveLength(0);

    const changed = computeLeaveMutations(
      [draft({ leaveId: "10", reason: "Updated" })],
      baseline
    );
    expect(changed.edits).toHaveLength(1);
    expect(changed.creates).toHaveLength(0);
  });

  it("removes baseline rows no longer present", () => {
    const baseline = [draft({ leaveId: "10" }), draft({ leaveId: "11" })];
    const result = computeLeaveMutations([draft({ leaveId: "10" })], baseline);
    expect(result.removes).toEqual(["11"]);
  });
});
