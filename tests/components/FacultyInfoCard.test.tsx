import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FacultyInfoCard from "@/components/course-preference/FacultyInfoCard";
import { createEmptyYearData } from "@/components/course-preference/coursePreferenceUtils";
import type { Faculty } from "@/types/faculty";

// FacultyInfoCard only reads faculty.name, so a minimal stub is enough.
const faculty = { name: "Test Faculty" } as Faculty;

describe("FacultyInfoCard role editing", () => {
  it("renders role checkboxes and toggles via onToggleRole when unlocked", () => {
    const onToggleRole = vi.fn();
    const yearData = { ...createEmptyYearData(), roles: ["Chair"] };

    render(
      <FacultyInfoCard
        faculty={faculty}
        yearData={yearData}
        isLocked={false}
        onToggleRole={onToggleRole}
      />
    );

    expect((screen.getByLabelText("Chair") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("Center Director") as HTMLInputElement).checked).toBe(false);

    fireEvent.click(screen.getByLabelText("Center Director"));
    expect(onToggleRole).toHaveBeenCalledWith("Center Director");
  });

  it("shows roles read-only when the year is locked", () => {
    const yearData = { ...createEmptyYearData(), roles: ["Chair"] };

    render(
      <FacultyInfoCard
        faculty={faculty}
        yearData={yearData}
        isLocked={true}
        onToggleRole={() => {}}
      />
    );

    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.getByText("Chair")).toBeInTheDocument();
  });
});
