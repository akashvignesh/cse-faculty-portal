import "server-only";
import qs from "qs";
import type { IDtRequest } from "datatables.net-editor-server";

/**
 * Parses an Editor-protocol request body.
 *
 * The licensed Editor client posts application/x-www-form-urlencoded with
 * nested bracket keys (data[row_5][cfp_committee_assignment][role_code]=C);
 * editor.process() needs that already expanded into a nested object, which is
 * what `qs` does (the Express demos rely on body-parser's extended mode).
 * Our own React UIs post plain JSON — both are accepted.
 */
export async function parseEditorBody(request: Request): Promise<IDtRequest> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await request.json()) as IDtRequest;
  }

  const text = await request.text();
  // arrayLimit must exceed the largest multi-row submit (committee matrix can
  // exceed qs's default of 20, which would silently convert arrays to objects).
  return qs.parse(text, { depth: 10, arrayLimit: 3000 }) as IDtRequest;
}
