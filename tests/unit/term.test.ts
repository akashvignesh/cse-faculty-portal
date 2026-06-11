import { describe, expect, it } from "vitest";
import {
  academicYearTermCodes,
  decodeTermCode,
  isAcademicYear,
  termCodeToLabel,
  toTermCode,
} from "@/lib/term";

describe("decodeTermCode", () => {
  it("decodes the [century][YY][term] convention (Java-backend compatible)", () => {
    expect(decodeTermCode("2259")).toEqual({ year: 2025, term: "fall" });
    expect(decodeTermCode("2261")).toEqual({ year: 2026, term: "spring" });
    expect(decodeTermCode("2266")).toEqual({ year: 2026, term: "summer" });
    expect(decodeTermCode("1999")).toEqual({ year: 1999, term: "fall" });
  });

  it("rejects malformed and unknown-term codes", () => {
    expect(decodeTermCode("225")).toBeNull();
    expect(decodeTermCode("22X9")).toBeNull();
    expect(decodeTermCode("2253")).toBeNull(); // 3 is not a term digit
    expect(decodeTermCode(null)).toBeNull();
    expect(decodeTermCode(2259)).toBeNull();
  });
});

describe("toTermCode", () => {
  it("is the inverse of decodeTermCode", () => {
    expect(toTermCode(2025, "fall")).toBe("2259");
    expect(toTermCode(2026, "spring")).toBe("2261");
    expect(decodeTermCode(toTermCode(2031, "summer"))).toEqual({ year: 2031, term: "summer" });
  });
});

describe("academicYearTermCodes", () => {
  it("anchors fall to the first year and spring/summer to the second", () => {
    expect(academicYearTermCodes("2025-2026")).toEqual({
      fall: "2259",
      spring: "2261",
      summer: "2266",
    });
  });

  it("rejects non-consecutive years", () => {
    expect(() => academicYearTermCodes("2025-2027")).toThrow(/Invalid academic year/);
  });
});

describe("isAcademicYear", () => {
  it("accepts consecutive YYYY-YYYY strings only", () => {
    expect(isAcademicYear("2025-2026")).toBe(true);
    expect(isAcademicYear("2025-2027")).toBe(false);
    expect(isAcademicYear("25-26")).toBe(false);
  });
});

describe("termCodeToLabel", () => {
  it("renders a human-readable label", () => {
    expect(termCodeToLabel("2259")).toBe("Fall 2025");
    expect(termCodeToLabel("9999")).toBe("Fall 2799");
    expect(termCodeToLabel("bogus")).toBe("bogus");
  });
});
