// Client-side data layer for the course preference planner.
//
// Semester plans persist through the Editor-protocol routes (header row in
// cfp_faculty_course_plan, slot rows in cfp_faculty_semester_plan). Teaching
// preferences persist through the /api/v1 teaching-preferences endpoint,
// threading the Fall-anchor term code of the selected academic year.

import { editorLoad, editorSubmit, EditorError } from "@/lib/editor/client";
import { academicYearTermCodes } from "@/lib/term";
import type { ApiResponse } from "@/types/api";
import type {
  FacultyType,
  PlannerCoursePreference,
  SemesterPlan,
  SemesterSlot,
  TermKey,
} from "@/types/faculty";

const PLAN_URL = "/api/editor/course-plan";
const SLOT_URL = "/api/editor/semester-plan";
const PLAN_TABLE = "cfp_faculty_course_plan";
const SLOT_TABLE = "cfp_faculty_semester_plan";

interface PlanRow {
  DT_RowId?: string;
  cfp_faculty_course_plan?: {
    course_plan_id: number | string;
    person_number: string;
    academic_year: string;
    faculty_type: string | null;
    locked: number | string;
  };
}

interface SlotRow {
  DT_RowId?: string;
  cfp_faculty_semester_plan?: {
    semester_plan_id: number | string;
    course_plan_id: number | string;
    term: TermKey;
    slot_status: "Teaching" | "Not Teaching";
    slot_comment: string | null;
  };
}

export interface StoredYearPlan {
  coursePlanId: number;
  facultyType: FacultyType | null;
  locked: boolean;
  semesterPlan: SemesterPlan;
  /** DT row ids of the stored slots — the baseline for replace-on-save. */
  slotRowIds: string[];
}

/** Loads the stored plan for one faculty + year. Null when none exists or in mock mode. */
export async function loadStoredYearPlan(
  personNumber: string,
  academicYear: string
): Promise<{ available: boolean; plan: StoredYearPlan | null }> {
  let planRows: PlanRow[];
  try {
    planRows = await editorLoad<PlanRow>(
      `${PLAN_URL}?person_number=${encodeURIComponent(personNumber)}&academic_year=${encodeURIComponent(academicYear)}`
    );
  } catch (error) {
    if (error instanceof EditorError) {
      // Mock mode / editor backend unavailable.
      return { available: false, plan: null };
    }
    throw error;
  }

  const header = planRows[0]?.cfp_faculty_course_plan;
  if (!header) {
    return { available: true, plan: null };
  }

  const slotRows = await editorLoad<SlotRow>(
    `${SLOT_URL}?course_plan_id=${encodeURIComponent(String(header.course_plan_id))}`
  );

  const semesterPlan: SemesterPlan = { summer: [], fall: [], spring: [] };
  const slotRowIds: string[] = [];
  for (const row of slotRows) {
    const slot = row.cfp_faculty_semester_plan;
    if (!slot) continue;
    const rowId = row.DT_RowId ?? `row_${slot.semester_plan_id}`;
    slotRowIds.push(rowId);
    semesterPlan[slot.term].push({
      id: rowId,
      status: slot.slot_status,
      comment: slot.slot_comment ?? "",
    });
  }

  return {
    available: true,
    plan: {
      coursePlanId: Number(header.course_plan_id),
      facultyType: (header.faculty_type as FacultyType) ?? null,
      locked: Number(header.locked) === 1,
      semesterPlan,
      slotRowIds,
    },
  };
}

export interface SaveYearPlanInput {
  personNumber: string;
  academicYear: string;
  facultyType: FacultyType;
  semesterPlan: SemesterPlan;
  /** Stored plan as loaded (null when creating from scratch). */
  storedPlan: StoredYearPlan | null;
}

export interface SaveYearPlanResult {
  coursePlanId: number;
  slotsSaved: number;
}

/** Upserts the header row, then replaces the slot rows with the current state. */
export async function saveYearPlan(input: SaveYearPlanInput): Promise<SaveYearPlanResult> {
  const { personNumber, academicYear, facultyType, semesterPlan, storedPlan } = input;

  let coursePlanId = storedPlan?.coursePlanId ?? null;

  if (coursePlanId === null) {
    const created = await editorSubmit<PlanRow>(PLAN_URL, "create", {
      "0": {
        [PLAN_TABLE]: {
          person_number: personNumber,
          academic_year: academicYear,
          faculty_type: facultyType,
          locked: "0",
        },
      },
    });
    const header = created.data?.[0]?.cfp_faculty_course_plan;
    if (!header) {
      throw new EditorError("Course plan creation returned no row");
    }
    coursePlanId = Number(header.course_plan_id);
  } else if (storedPlan && storedPlan.facultyType !== facultyType) {
    await editorSubmit(PLAN_URL, "edit", {
      [`row_${coursePlanId}`]: { [PLAN_TABLE]: { faculty_type: facultyType } },
    });
  }

  // Replace slots: remove everything stored, then create the current state.
  if (storedPlan && storedPlan.slotRowIds.length > 0) {
    const removes = Object.fromEntries(storedPlan.slotRowIds.map((rowId) => [rowId, {}]));
    await editorSubmit(SLOT_URL, "remove", removes);
  }

  const slots: SemesterSlot[] = [];
  const slotPayload: Record<string, Record<string, unknown>> = {};
  (Object.keys(semesterPlan) as TermKey[]).forEach((term) => {
    semesterPlan[term].forEach((slot) => {
      slotPayload[String(slots.length)] = {
        [SLOT_TABLE]: {
          course_plan_id: coursePlanId,
          term,
          slot_status: slot.status,
          slot_comment: slot.comment || null,
        },
      };
      slots.push(slot);
    });
  });

  if (Object.keys(slotPayload).length > 0) {
    await editorSubmit(SLOT_URL, "create", slotPayload);
  }

  return { coursePlanId, slotsSaved: slots.length };
}

export interface SavePreferencesResult {
  totalProcessed: number;
  message: string;
}

/**
 * Persists the 0..5 course rankings, deleting baseline entries the user
 * removed. Works in both modes (local mode echoes without persistence).
 */
export async function saveCourseRankings(
  userid: string,
  academicYear: string,
  preferences: PlannerCoursePreference[],
  baseline: PlannerCoursePreference[]
): Promise<SavePreferencesResult> {
  const currentByName = new Map(preferences.map((p) => [p.courseName, p]));

  const items: { courseName: string; pref: number | null }[] = preferences.map((p) => ({
    courseName: p.courseName,
    pref: p.ranking,
  }));
  for (const baselinePref of baseline) {
    if (!currentByName.has(baselinePref.courseName)) {
      items.push({ courseName: baselinePref.courseName, pref: null });
    }
  }

  if (items.length === 0) {
    return { totalProcessed: 0, message: "No course preference changes to save." };
  }

  const response = await fetch(
    `/api/v1/faculty/${encodeURIComponent(userid)}/teaching-preferences`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        facultyId: userid,
        termCode: academicYearTermCodes(academicYear).fall,
        preferences: items,
      }),
    }
  );

  const payload = (await response.json()) as ApiResponse<{ totalProcessed: number }>;
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || `Saving preferences failed with status ${response.status}.`);
  }

  return {
    totalProcessed: payload.data?.totalProcessed ?? items.length,
    message: payload.message ?? "Teaching preferences saved successfully",
  };
}
