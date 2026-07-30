import { z } from "zod";

// Validation for the editable faculty profile (PATCH /api/v1/faculty/[id]/profile).
// Isomorphic (no "server-only") so the client can pre-validate before submit.
// Field lengths mirror the exact DB columns; .strict() rejects unknown keys so
// a crafted payload cannot set fields it shouldn't (mass-assignment protection).
// The server remains authoritative — this schema also runs there.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+()\-.\sxX]*$/; // digits + common separators/extension only

/** Personal email (cfp_faculty_primary_email.email_address, varchar(255)). Empty = clear. */
const personalEmail = z
  .string()
  .trim()
  .max(255, "Email must be 255 characters or fewer")
  .refine((v) => v === "" || EMAIL_RE.test(v), "Must be a valid email address");

/** Phone (cfp_faculty_primary_phone_number.phone_number, varchar(50)). Empty = clear. */
const phone = z
  .string()
  .trim()
  .max(50, "Phone must be 50 characters or fewer")
  .refine((v) => PHONE_RE.test(v), "Phone may contain only digits and + ( ) - . x");

/** Personal address (cfp_faculty_primary_address). All-empty = clear the row. */
export const profileAddressSchema = z
  .object({
    line1: z.string().trim().max(255).default(""),
    line2: z.string().trim().max(255).default(""),
    city: z.string().trim().max(100).default(""),
    state: z.string().trim().max(100).default(""),
    postalCode: z.string().trim().max(30).default(""),
    country: z.string().trim().max(100).default(""),
  })
  .strict()
  .refine(
    // address_line1 is NOT NULL, so any non-empty address must include line1.
    (a) => {
      const anyFilled = Object.values(a).some((v) => v !== "");
      return !anyFilled || a.line1 !== "";
    },
    { message: "Address line 1 is required when an address is provided", path: ["line1"] }
  );

export const profilePatchSchema = z
  .object({
    personalEmail: personalEmail.optional(),
    phone: phone.optional(),
    address: profileAddressSchema.optional(),
    // Research-area ids; existence is validated server-side against the master.
    researchAreaIds: z.array(z.number().int().positive()).max(200).optional(),
  })
  .strict();

export type ProfilePatch = z.infer<typeof profilePatchSchema>;
export type ProfileAddress = z.infer<typeof profileAddressSchema>;
