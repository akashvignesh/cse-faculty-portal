import { describe, expect, it } from "vitest";
import { profilePatchSchema } from "@/lib/api/profileSchema";

describe("profilePatchSchema", () => {
  it("accepts a valid partial patch", () => {
    const parsed = profilePatchSchema.parse({
      personalEmail: "jane@example.com",
      phone: "+1-716-555-0100",
      researchAreaIds: [14, 15],
    });
    expect(parsed.personalEmail).toBe("jane@example.com");
    expect(parsed.researchAreaIds).toEqual([14, 15]);
  });

  it("accepts empty strings as a clear signal", () => {
    expect(profilePatchSchema.parse({ personalEmail: "", phone: "" })).toEqual({
      personalEmail: "",
      phone: "",
    });
  });

  it("rejects a malformed email", () => {
    expect(profilePatchSchema.safeParse({ personalEmail: "not-an-email" }).success).toBe(false);
  });

  it("rejects an over-length email", () => {
    const long = `${"a".repeat(250)}@x.com`;
    expect(profilePatchSchema.safeParse({ personalEmail: long }).success).toBe(false);
  });

  it("rejects phone values containing letters other than x", () => {
    expect(profilePatchSchema.safeParse({ phone: "call-me" }).success).toBe(false);
    expect(profilePatchSchema.safeParse({ phone: "+1 716 555 0100 x12" }).success).toBe(true);
  });

  it("rejects unknown keys (mass-assignment protection)", () => {
    const result = profilePatchSchema.safeParse({ phone: "5", role: "chair" });
    expect(result.success).toBe(false);
  });

  it("requires address line1 when any address field is provided", () => {
    expect(profilePatchSchema.safeParse({ address: { city: "Buffalo" } }).success).toBe(false);
    expect(
      profilePatchSchema.safeParse({ address: { line1: "1 Main St", city: "Buffalo" } }).success
    ).toBe(true);
    // A fully empty address is allowed (means "clear it").
    expect(profilePatchSchema.safeParse({ address: {} }).success).toBe(true);
  });

  it("rejects non-integer or negative research area ids", () => {
    expect(profilePatchSchema.safeParse({ researchAreaIds: [1.5] }).success).toBe(false);
    expect(profilePatchSchema.safeParse({ researchAreaIds: [-3] }).success).toBe(false);
    expect(profilePatchSchema.safeParse({ researchAreaIds: ["14"] }).success).toBe(false);
  });

  it("trims and enforces address sub-field lengths", () => {
    const bad = profilePatchSchema.safeParse({
      address: { line1: "x", postalCode: "1".repeat(31) },
    });
    expect(bad.success).toBe(false);
  });
});
