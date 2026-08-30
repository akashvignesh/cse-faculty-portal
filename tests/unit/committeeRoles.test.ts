import { describe, expect, it } from "vitest";
import {
  ALLOWED_MEMBER_ROLES,
  dbRoleToUiCode,
  isEquivalentLegacyRole,
  uiCodeToDbRole,
  type MatrixCellCode,
} from "@/lib/committeeRoles";

describe("committeeRoles", () => {
  it("keeps every stored role within members.role's VARCHAR(16)", () => {
    for (const role of ALLOWED_MEMBER_ROLES) {
      expect(role.length).toBeLessThanOrEqual(16);
    }
  });

  it("round-trips every UI code through the stored role string", () => {
    const committeeCodes: MatrixCellCode[] = ["R", "C", "V", "M"];
    for (const code of committeeCodes) {
      expect(dbRoleToUiCode(uiCodeToDbRole(code), "committee")).toBe(code);
    }
    expect(dbRoleToUiCode(uiCodeToDbRole("X"), "role")).toBe("X");
  });

  it("maps stored roles case-insensitively", () => {
    expect(dbRoleToUiCode("chair", "committee")).toBe("C");
    expect(dbRoleToUiCode("VICE CHAIR", "committee")).toBe("V");
    expect(dbRoleToUiCode("vice-chair", "committee")).toBe("V");
    expect(dbRoleToUiCode("role", "committee")).toBe("R");
    expect(dbRoleToUiCode("member", "committee")).toBe("M");
  });

  it("displays unknown legacy roles as Member on committee columns", () => {
    expect(dbRoleToUiCode("Recorder", "committee")).toBe("M");
  });

  it("displays Co-Chair (live legacy value) as Chair", () => {
    expect(dbRoleToUiCode("Co-Chair", "committee")).toBe("C");
    expect(dbRoleToUiCode("co chair", "committee")).toBe("C");
  });

  it("treats any row on a leadership column as the position holder", () => {
    expect(dbRoleToUiCode("Position", "role")).toBe("X");
    expect(dbRoleToUiCode("Chair", "role")).toBe("X");
  });

  it("returns an empty cell for missing roles", () => {
    expect(dbRoleToUiCode(null, "committee")).toBe("");
    expect(dbRoleToUiCode("  ", "role")).toBe("");
  });
});

describe("isEquivalentLegacyRole", () => {
  it("protects Co-Chair from being flattened into Chair", () => {
    // The live table holds 4 of these (GAC and UGAC); "Chair" is the only
    // writable role the C cell can produce.
    expect(isEquivalentLegacyRole("Co-Chair", "Chair")).toBe(true);
  });

  it("still allows a genuine cell change away from the legacy value", () => {
    expect(isEquivalentLegacyRole("Co-Chair", "Member")).toBe(false);
    expect(isEquivalentLegacyRole("Co-Chair", "Vice Chair")).toBe(false);
  });

  it("keeps an unknown legacy role that already reads as Member", () => {
    expect(isEquivalentLegacyRole("Recorder", "Member")).toBe(true);
    expect(isEquivalentLegacyRole("Recorder", "Chair")).toBe(false);
  });

  it("never blocks a write when the stored role is one the portal owns", () => {
    for (const role of ALLOWED_MEMBER_ROLES) {
      expect(isEquivalentLegacyRole(role, "Chair")).toBe(false);
      expect(isEquivalentLegacyRole(role, "Member")).toBe(false);
    }
  });

  it("ignores empty or missing stored roles", () => {
    expect(isEquivalentLegacyRole(null, "Member")).toBe(false);
    expect(isEquivalentLegacyRole("", "Member")).toBe(false);
    expect(isEquivalentLegacyRole("   ", "Member")).toBe(false);
  });
});
