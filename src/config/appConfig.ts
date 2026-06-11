export const FACULTY_DATA_MODES = {
  LOCAL: "local",
  DEV: "dev",
} as const;

export type FacultyDataMode = (typeof FACULTY_DATA_MODES)[keyof typeof FACULTY_DATA_MODES];

export const APP_TITLE = "CSE Faculty Portal";

export interface AppConfig {
  appTitle: string;
  facultyDataMode: FacultyDataMode;
  facultyApiUrl: string;
}

function isFacultyDataMode(value: string): value is FacultyDataMode {
  return Object.values(FACULTY_DATA_MODES).includes(value as FacultyDataMode);
}

export function getAppConfig(): AppConfig {
  const requestedMode = (process.env.NEXT_PUBLIC_FACULTY_DATA_MODE || FACULTY_DATA_MODES.LOCAL)
    .trim()
    .toLowerCase();

  if (!isFacultyDataMode(requestedMode)) {
    throw new Error("NEXT_PUBLIC_FACULTY_DATA_MODE must be either 'local' or 'dev'.");
  }

  return {
    appTitle: APP_TITLE,
    facultyDataMode: requestedMode,
    facultyApiUrl: (process.env.NEXT_PUBLIC_FACULTY_API_URL || "").trim(),
  };
}
