import { describe, expect, it } from "vitest";
import {
  ALLOWED_MEMBER_ROLES,
  dbRoleToUiCode,
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
