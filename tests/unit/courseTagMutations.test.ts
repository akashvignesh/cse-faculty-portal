import { describe, expect, it } from "vitest";
import {
  computeTagMutations,
  type CourseTagAssignment,
} from "@/services/courseTags/courseTagService";

const baseline: CourseTagAssignment[] = [
  { rowId: "row_1", tagId: 1 },
  { rowId: "row_2", tagId: 2 },
];

describe("computeTagMutations", () => {
  it("creates tags that are newly selected", () => {
    const result = computeTagMutations([1, 2, 3], baseline);
    expect(result.createTagIds).toEqual([3]);
    expect(result.removeRowIds).toEqual([]);
  });

  it("removes the row for a tag that was deselected", () => {
    const result = computeTagMutations([1], baseline);
    expect(result.createTagIds).toEqual([]);
    expect(result.removeRowIds).toEqual(["row_2"]);
  });

  it("does nothing when the selection matches the baseline", () => {
    const result = computeTagMutations([1, 2], baseline);
    expect(result.createTagIds).toEqual([]);
    expect(result.removeRowIds).toEqual([]);
  });
});
