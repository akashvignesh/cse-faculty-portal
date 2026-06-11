import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FacultyTabNav, { DETAIL_TABS } from "@/components/faculty-detail/FacultyTabNav";

describe("FacultyTabNav", () => {
  it("renders all seven tabs with the active one selected", () => {
    render(<FacultyTabNav activeTab={DETAIL_TABS.RESEARCH_AREA} onSelect={() => {}} />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(7);
    expect(screen.getByRole("tab", { name: "Research Area" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("tab", { name: "Teaching History" })).toHaveAttribute(
      "aria-selected",
      "false"
    );
  });

  it("invokes onSelect with the clicked tab id", () => {
    const onSelect = vi.fn();
    render(<FacultyTabNav activeTab={DETAIL_TABS.RESEARCH_AREA} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("tab", { name: "Committee" }));
    expect(onSelect).toHaveBeenCalledWith(DETAIL_TABS.COMMITTEE);

    fireEvent.click(screen.getByRole("tab", { name: "Awards" }));
    expect(onSelect).toHaveBeenCalledWith(DETAIL_TABS.AWARDS);
  });
});
