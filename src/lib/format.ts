// Shared display formatters extracted from the legacy page components.

export function displayValue(value: unknown): string {
  return value ? String(value) : "Not available";
}

export function getInitials(name: string | null | undefined): string {
  if (!name) {
    return "F";
  }

  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function getFirstName(name: string | null | undefined): string {
  return name?.split(" ")[0] || "Faculty";
}

export function formatTerm(term: string | null | undefined): string {
  if (!term) {
    return "Not available";
  }

  return term.charAt(0).toUpperCase() + term.slice(1);
}

/** Renders both the legacy label scale and the numeric 0..5 scale. */
export function formatCoursePreferencePriority(priority: unknown): string {
  const normalizedPriority =
    typeof priority === "string" ? priority.trim().toLowerCase() : String(priority).trim();

  if (!normalizedPriority) {
    return "Not available";
  }

  switch (normalizedPriority) {
    case "1":
    case "preference1":
      return "Preferred 1";
    case "2":
    case "preference2":
      return "Preferred 2";
    case "3":
    case "preference3":
      return "Preferred 3";
    case "qualified":
      return "Qualified";
    case "0":
    case "not qualified":
      return "Not Qualified";
    case "not interested":
    case "not_interested":
      return "Not Interested";
    case "4":
      return "Preferred 4";
    case "5":
      return "Preferred 5";
    default:
      return displayValue(String(priority));
  }
}

export function toggleFilterValue(values: string[], value: unknown): string[] {
  const normalizedValue = String(value);

  if (values.includes(normalizedValue)) {
    return values.filter((currentValue) => currentValue !== normalizedValue);
  }

  return [...values, normalizedValue];
}
