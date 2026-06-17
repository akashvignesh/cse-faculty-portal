// Client-side data layer for course area tags
// (/api/editor/area-tag-master + /api/editor/course-area-tag).

import { editorLoad, editorSubmit, EditorError } from "@/lib/editor/client";

const MASTER_URL = "/api/editor/area-tag-master";
const TAG_URL = "/api/editor/course-area-tag";
const TAG_TABLE = "cfp_course_area_tag";

export interface AreaTag {
  tagId: number;
  name: string;
}

export interface CourseTagAssignment {
  rowId: string;
  tagId: number;
}

interface MasterRow {
  cfp_area_tag_master?: { tag_id: number | string; name: string };
}

interface TagRow {
  DT_RowId?: string;
  cfp_course_area_tag?: { course_area_tag_id: number | string; crse_id: string; tag_id: number | string };
}

export interface TagMutations {
  createTagIds: number[];
  removeRowIds: string[];
}

/** Diffs the selected tag ids against the stored assignments. */
export function computeTagMutations(
  selected: number[],
  baseline: CourseTagAssignment[]
): TagMutations {
  const baselineTagIds = new Set(baseline.map((a) => a.tagId));
  const selectedSet = new Set(selected);
  return {
    createTagIds: selected.filter((id) => !baselineTagIds.has(id)),
    removeRowIds: baseline.filter((a) => !selectedSet.has(a.tagId)).map((a) => a.rowId),
  };
}

/** Loads the canonical area-tag list. available=false signals mock mode. */
export async function loadAreaTagMaster(): Promise<{ available: boolean; tags: AreaTag[] }> {
  let rows: MasterRow[];
  try {
    rows = await editorLoad<MasterRow>(MASTER_URL);
  } catch (error) {
    if (error instanceof EditorError) {
      return { available: false, tags: [] };
    }
    throw error;
  }
  const tags: AreaTag[] = [];
  for (const row of rows) {
    const t = row.cfp_area_tag_master;
    if (!t) continue;
    tags.push({ tagId: Number(t.tag_id), name: t.name });
  }
  return { available: true, tags };
}

/** Loads the tag assignments for one course. */
export async function loadCourseTags(
  crseId: string
): Promise<{ available: boolean; assignments: CourseTagAssignment[] }> {
  let rows: TagRow[];
  try {
    rows = await editorLoad<TagRow>(`${TAG_URL}?crse_id=${encodeURIComponent(crseId)}`);
  } catch (error) {
    if (error instanceof EditorError) {
      return { available: false, assignments: [] };
    }
    throw error;
  }
  const assignments: CourseTagAssignment[] = [];
  for (const row of rows) {
    const a = row.cfp_course_area_tag;
    if (!a) continue;
    assignments.push({
      rowId: row.DT_RowId ?? `row_${a.course_area_tag_id}`,
      tagId: Number(a.tag_id),
    });
  }
  return { available: true, assignments };
}

export interface SaveTagsResult {
  created: number;
  removed: number;
}

/** Applies the create/remove diff for a course's tags. */
export async function saveCourseTags(
  crseId: string,
  selectedTagIds: number[],
  baseline: CourseTagAssignment[]
): Promise<SaveTagsResult> {
  const { createTagIds, removeRowIds } = computeTagMutations(selectedTagIds, baseline);

  if (removeRowIds.length > 0) {
    await editorSubmit(
      TAG_URL,
      "remove",
      Object.fromEntries(removeRowIds.map((id) => [id, {}]))
    );
  }
  if (createTagIds.length > 0) {
    const payload: Record<string, Record<string, unknown>> = {};
    createTagIds.forEach((tagId, index) => {
      payload[String(index)] = { [TAG_TABLE]: { crse_id: crseId, tag_id: tagId } };
    });
    await editorSubmit(TAG_URL, "create", payload);
  }

  return { created: createTagIds.length, removed: removeRowIds.length };
}
