export const APP_TITLE = "CSE Faculty Portal";

export interface AppConfig {
  appTitle: string;
}

// The data-mode switch (local mock vs database) is server-side only now —
// see src/lib/env.ts. The browser always calls this app's own /api routes.
export function getAppConfig(): AppConfig {
  return {
    appTitle: APP_TITLE,
  };
}
