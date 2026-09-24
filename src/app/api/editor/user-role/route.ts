export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Editor, { Field, Validate } from "datatables.net-editor-server";
import { withErrorHandler } from "@/lib/api/errors";
import { requirePermission } from "@/lib/api/guard";
import { parseEditorBody } from "@/lib/editor/body";
import { auditFields, createEditor } from "@/lib/editor/factory";
import { chairAssignmentGuard, lastChairValidator } from "@/lib/editor/lastChair";
import { ROLES } from "@/lib/permissions";

// RBAC role assignments. Chair and staff may manage users (permission
// "user-role:edit"), but chairAssignmentGuard keeps chair appointment/removal
// chair-only. One row per dce principal; unassigned roster members default to
// faculty, everyone else to viewer (src/server/queries/roles.ts).
const TABLE = "cfp_user_role";

async function buildEditor(): Promise<Editor> {
  const { editor, session } = await createEditor(TABLE, "user_role_id", {
    resource: "user-role",
  });
  return editor
    .fields(
      // Pkey as read-only field so GET rows are self-describing.
      new Field(`${TABLE}.user_role_id`).set(false),
      new Field(`${TABLE}.userid`).validator(Validate.notEmpty()).validator(Validate.maxLen(8)),
      new Field(`${TABLE}.role`)
        .validator(Validate.notEmpty())
        .validator(Validate.values([...ROLES])),
      ...auditFields(TABLE, session)
    )
    // Only a chair can appoint/remove chairs (blocks staff self-escalation).
    .validator(chairAssignmentGuard(session))
    // Lockout protection: never allow demoting/removing the final chair.
    .validator(lastChairValidator);
}

/** GET /api/editor/user-role — the role list is itself chair-only. */
export const GET = withErrorHandler(async () => {
  await requirePermission("user-role:edit");
  const editor = await buildEditor();
  await editor.process({});
  return NextResponse.json(editor.data());
});

/** POST /api/editor/user-role — Editor protocol create/edit/remove */
export const POST = withErrorHandler(async (request: Request) => {
  const body = await parseEditorBody(request);
  const editor = await buildEditor();
  await editor.process(body);
  return NextResponse.json(editor.data());
});
