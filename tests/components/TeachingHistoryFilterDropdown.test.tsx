import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TeachingHistoryFilterDropdown from "@/components/faculty-detail/tabs/TeachingHistoryFilterDropdown";

describe("TeachingHistoryFilterDropdown", () => {
  it('summarises as "All" with no selection and lists selected values otherwise', () => {
    const { rerender } = render(
      <TeachingHistoryFilterDropdown
        label="Year"
        values={["2025", "2024"]}
        selectedValues={[]}
        onToggle={() => {}}
        onClear={() => {}}
      />
    );
    expect(screen.getByText("Year: All")).toBeInTheDocument();

    rerender(
      <TeachingHistoryFilterDropdown
        label="Year"
        values={["2025", "2024"]}
        selectedValues={["2025"]}
        onToggle={() => {}}
        onClear={() => {}}
      />
    );
    expect(screen.getByText("Year: 2025")).toBeInTheDocument();
  });

  it("toggles values and clears the selection", () => {
    const onToggle = vi.fn();
    const onClear = vi.fn();
    render(
      <TeachingHistoryFilterDropdown
        label="Term"
        values={["spring", "fall"]}
        selectedValues={["fall"]}
        onToggle={onToggle}
        onClear={onClear}
        formatValue={(value) => value.toUpperCase()}
      />
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "SPRING" }));
    expect(onToggle).toHaveBeenCalledWith("spring");

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onClear).toHaveBeenCalled();
  });
});
