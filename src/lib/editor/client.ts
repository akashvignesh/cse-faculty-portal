// Browser-side helper that speaks the DataTables Editor wire protocol to our
// /api/editor/* routes — no licensed Editor client involved. Field names must
// be fully qualified (table.column) and submitted data nests accordingly:
//   rows = { "row_7": { cfp_committee_assignment: { role_code: "C" } } }
// Use row id 0 (or any placeholder) for creates.

export type EditorAction = "create" | "edit" | "remove";

export interface EditorFieldError {
  id?: string;
  name: string;
  status: string;
}

export interface EditorResponse<TRow = Record<string, unknown>> {
  data?: TRow[];
  error?: string;
  fieldErrors?: EditorFieldError[];
  cancelled?: string[];
  options?: Record<string, unknown>;
}

export class EditorError extends Error {
  constructor(
    message: string,
    public readonly fieldErrors: EditorFieldError[] = []
  ) {
    super(message);
    this.name = "EditorError";
  }
}

function throwOnError<TRow>(response: EditorResponse<TRow>): EditorResponse<TRow> {
  if (response.error) {
    throw new EditorError(response.error, response.fieldErrors ?? []);
  }
  if (response.fieldErrors && response.fieldErrors.length > 0) {
    const summary = response.fieldErrors
      .map((fieldError) => `${fieldError.name}: ${fieldError.status}`)
      .join("; ");
    throw new EditorError(`Validation failed — ${summary}`, response.fieldErrors);
  }
  return response;
}

export async function editorLoad<TRow = Record<string, unknown>>(
  url: string,
  fetchImpl: typeof fetch = fetch
): Promise<TRow[]> {
  const response = await fetchImpl(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  const payload = (await response.json()) as EditorResponse<TRow>;
  if (!response.ok) {
    throw new EditorError(payload.error ?? `Editor load failed with status ${response.status}`);
  }
  return throwOnError(payload).data ?? [];
}

export async function editorSubmit<TRow = Record<string, unknown>>(
  url: string,
  action: EditorAction,
  rows: Record<string, Record<string, unknown>>,
  fetchImpl: typeof fetch = fetch
): Promise<EditorResponse<TRow>> {
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ action, data: rows }),
  });

  const payload = (await response.json()) as EditorResponse<TRow>;
  if (!response.ok) {
    throw new EditorError(payload.error ?? `Editor submit failed with status ${response.status}`);
  }
  return throwOnError(payload);
}
