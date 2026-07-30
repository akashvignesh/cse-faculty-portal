// Client data layer for the editable faculty profile
// (GET/PATCH /api/v1/faculty/[id]/profile). Server enforces RBAC + validation;
// this just carries the typed payload and surfaces server error messages.

import type { ProfilePatch } from "@/lib/api/profileSchema";
import type { EditableProfile } from "@/server/data/types";

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { Accept: "application/json", ...(init?.headers ?? {}) },
  });
  const payload = (await response.json()) as { success?: boolean; message?: string; data?: T };
  if (!response.ok || !payload.success || payload.data === undefined) {
    throw new Error(payload.message ?? `Request failed with status ${response.status}`);
  }
  return payload.data;
}

export function loadProfile(id: string): Promise<EditableProfile> {
  return requestJson<EditableProfile>(`/api/v1/faculty/${encodeURIComponent(id)}/profile`);
}

export function saveProfile(id: string, patch: ProfilePatch): Promise<EditableProfile> {
  return requestJson<EditableProfile>(`/api/v1/faculty/${encodeURIComponent(id)}/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}
