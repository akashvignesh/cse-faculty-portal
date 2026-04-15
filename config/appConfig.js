export const FACULTY_DATA_MODES = {
  LOCAL: "local",
  DEV: "dev",
};

export const APP_TITLE = "CSE Faculty Portal";

export function getAppConfig() {
  const requestedMode = (process.env.NEXT_PUBLIC_FACULTY_DATA_MODE || FACULTY_DATA_MODES.LOCAL)
    .trim()
    .toLowerCase();

  if (!Object.values(FACULTY_DATA_MODES).includes(requestedMode)) {
    throw new Error(
      "NEXT_PUBLIC_FACULTY_DATA_MODE must be either 'local' or 'dev'."
    );
  }

  return {
    appTitle: APP_TITLE,
    facultyDataMode: requestedMode,
    facultyApiUrl: (process.env.NEXT_PUBLIC_FACULTY_API_URL || "").trim(),
  };
}
