import "server-only";
import { z } from "zod";

// Server-side environment configuration.
// In `local` mode no DB variables are required and the knex pool is never
// created — the portal runs fully offline against the bundled mock data.
const envSchema = z
  .object({
    FACULTY_DATA_MODE: z.enum(["local", "db"]).default("local"),
    DB_HOST: z.string().default("127.0.0.1"),
    DB_PORT: z.coerce.number().int().positive().default(3307),
    DB_USER: z.string().optional(),
    DB_PASSWORD: z.string().optional(),
    DB_DATABASE: z.string().default("ubs_emp"),
    /** Stamped into cfp_* editor/audit columns until real auth lands. */
    DEV_USERID: z.string().min(1).max(8).default("system"),
    /** Forces the dev identity's role, bypassing the cfp_user_role lookup. */
    DEV_ROLE: z.enum(["chair", "staff", "faculty", "viewer"]).optional(),
    /** Set to "1" to enable the dev role switcher in a production build. */
    AUTH_DEV_SWITCHER: z.enum(["0", "1"]).optional(),
    /**
     * Optional shared secret that gates the dev switcher on a deployed test
     * server. When set, /api/dev/impersonate requires this value — so a test
     * deploy isn't wide open to anyone who finds it. Leave unset for a private
     * (VPN/basic-auth) box where the switcher can be open.
     */
    AUTH_DEV_SWITCHER_SECRET: z.string().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.FACULTY_DATA_MODE === "db") {
      if (!value.DB_USER) {
        ctx.addIssue({
          code: "custom",
          path: ["DB_USER"],
          message: "DB_USER is required when FACULTY_DATA_MODE=db",
        });
      }
      if (!value.DB_PASSWORD) {
        ctx.addIssue({
          code: "custom",
          path: ["DB_PASSWORD"],
          message: "DB_PASSWORD is required when FACULTY_DATA_MODE=db",
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration — ${details}`);
  }
  return parsed.data;
}

export const env = loadEnv();

export const isDbMode = env.FACULTY_DATA_MODE === "db";

/**
 * The role switcher (cookie-based impersonation) is ON by default everywhere —
 * including the deployed test server — so testers can switch roles/users from
 * the UI during the pre-SSO testing phase without any server-side env changes.
 *
 * SECURITY: while on, anyone who can reach the server can impersonate any role
 * (including chair). Keep the test server on the restricted CSE network, and
 * for a key gate set AUTH_DEV_SWITCHER_SECRET. Turn the switcher OFF for real
 * production, or once UB SSO replaces impersonation, by setting
 * AUTH_DEV_SWITCHER=0.
 */
export const isDevSwitcherEnabled = env.AUTH_DEV_SWITCHER !== "0";
