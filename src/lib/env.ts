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
