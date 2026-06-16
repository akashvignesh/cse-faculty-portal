import "server-only";
import { isDbMode } from "@/lib/env";
import * as mocks from "@/server/mocks";
import type { FacultyDataSource } from "./types";

// The DB implementation is loaded lazily so local mode never touches knex.
async function dbSource(): Promise<FacultyDataSource> {
  const [faculty, teachingHistory, teachingPrefs, committees, courses] = await Promise.all([
    import("@/server/queries/faculty"),
    import("@/server/queries/teachingHistory"),
    import("@/server/queries/teachingPrefs"),
    import("@/server/queries/committees"),
    import("@/server/queries/courses"),
  ]);
  return {
    listFaculty: faculty.listFaculty,
    getFacultyDetail: faculty.getFacultyDetail,
    getFacultyPhoto: faculty.getFacultyPhoto,
    getTeachingHistory: teachingHistory.getTeachingHistory,
    getTeachingPreferences: teachingPrefs.getTeachingPreferences,
    saveTeachingPreferences: teachingPrefs.saveTeachingPreferences,
    getActiveCourses: courses.getActiveCourses,
    getCommitteeMemberships: committees.getCommitteeMemberships,
  };
}

export async function getDataSource(): Promise<FacultyDataSource> {
  if (isDbMode) {
    return dbSource();
  }
  return mocks satisfies FacultyDataSource;
}
