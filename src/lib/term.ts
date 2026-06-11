// Term-code helpers for the university's [century][YY][term] convention,
// matching the Java backend's decoder: fullYear = (centuryDigit + 18) * 100 + YY.
// So Fall 2025 = "2259" (century digit 2 → 20xx), Spring 2026 = "2261".
//
// NOTE: a comment in the DB migration script claims "20xx=3 → Fall 2025='3259'";
// that contradicts both the Java decoder and PeopleSoft convention. The decoder
// below follows the Java backend, which runs against the live ps_rpt data.
// Verify against `SELECT DISTINCT termsourcekey FROM ps_rpt.classschedule_v`
// before relying on encoding for new rows.

import type { TermKey } from "@/types/faculty";

const TERM_DIGIT: Record<TermKey, string> = {
  spring: "1",
  summer: "6",
  fall: "9",
};

const DIGIT_TERM: Record<string, TermKey> = {
  "1": "spring",
  "6": "summer",
  "9": "fall",
};

export interface DecodedTerm {
  year: number;
  term: TermKey;
}

export function decodeTermCode(termCode: unknown): DecodedTerm | null {
  if (typeof termCode !== "string") return null;
  const normalized = termCode.trim();
  if (!/^\d{4}$/.test(normalized)) return null;

  const centuryDigit = Number(normalized[0]);
  const yearWithinCentury = Number(normalized.slice(1, 3));
  const term = DIGIT_TERM[normalized[3] ?? ""];
  if (!term) return null;

  return { year: (centuryDigit + 18) * 100 + yearWithinCentury, term };
}

export function toTermCode(year: number, term: TermKey): string {
  const centuryDigit = Math.floor(year / 100) - 18;
  if (centuryDigit < 0 || centuryDigit > 9) {
    throw new Error(`Year ${year} is outside the supported term-code range`);
  }
  return `${centuryDigit}${String(year % 100).padStart(2, "0")}${TERM_DIGIT[term]}`;
}

export interface AcademicYearTermCodes {
  /** Fall of the first calendar year, e.g. Fall 2025 for "2025-2026". */
  fall: string;
  /** Spring of the second calendar year. */
  spring: string;
  /** Summer of the second calendar year. */
  summer: string;
}

const ACADEMIC_YEAR_PATTERN = /^(\d{4})-(\d{4})$/;

export function isAcademicYear(value: string): boolean {
  const match = ACADEMIC_YEAR_PATTERN.exec(value);
  if (!match) return false;
  return Number(match[2]) === Number(match[1]) + 1;
}

export function academicYearTermCodes(academicYear: string): AcademicYearTermCodes {
  const match = ACADEMIC_YEAR_PATTERN.exec(academicYear);
  if (!match || Number(match[2]) !== Number(match[1]) + 1) {
    throw new Error(`Invalid academic year (expected "YYYY-YYYY"): ${academicYear}`);
  }
  const firstYear = Number(match[1]);
  return {
    fall: toTermCode(firstYear, "fall"),
    spring: toTermCode(firstYear + 1, "spring"),
    summer: toTermCode(firstYear + 1, "summer"),
  };
}

/**
 * The academic year a date falls in. August–December belong to the year that
 * starts that fall; January–July to the year that started the previous fall.
 */
export function currentAcademicYear(date: Date = new Date()): string {
  const month = date.getMonth(); // 0-based
  const year = date.getFullYear();
  const startYear = month >= 7 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

export function termCodeToLabel(termCode: string): string {
  const decoded = decodeTermCode(termCode);
  if (!decoded) return termCode;
  const termName = decoded.term.charAt(0).toUpperCase() + decoded.term.slice(1);
  return `${termName} ${decoded.year}`;
}
