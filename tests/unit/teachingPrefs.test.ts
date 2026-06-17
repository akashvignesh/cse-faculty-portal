import { describe, expect, it } from "vitest";
import { validatePref } from "@/server/queries/teachingPrefsValidation";

// pref scale per the DB change script: 0 = Not Qualified … 5 = Most Preferred.
describe("validatePref", () => {
  it("allows the full 0..5 rating scale", () => {
    expect(validatePref(0, "CSE 115")).toBe(0);
    expect(validatePref(3, "CSE 115")).toBe(3);
    expect(validatePref(5, "CSE 115")).toBe(5);
  });

  it("treats null/undefined as a delete", () => {
    expect(validatePref(null, "CSE 115")).toBeNull();
    expect(validatePref(undefined, "CSE 115")).toBeNull();
  });

  it("rejects out-of-range and non-integer prefs", () => {
    expect(() => validatePref(6, "CSE 115")).toThrow();
    expect(() => validatePref(-1, "CSE 115")).toThrow();
    expect(() => validatePref(2.5, "CSE 115")).toThrow();
  });
});
