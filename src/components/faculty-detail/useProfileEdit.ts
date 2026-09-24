"use client";

import { useCallback, useMemo, useState } from "react";
import type { ProfilePatch } from "@/lib/api/profileSchema";
import type { EditableProfile, EditableProfileAddress } from "@/server/data/types";
import { loadProfile, saveProfile } from "@/services/faculty/profileService";

// Whole-page profile edit lifecycle: entering edit mode fetches the editable
// projection into a draft; fields mutate the draft; Apply opens a review of the
// exact field-level changes (from → to); confirming sends only the changed
// groups (so audit stamps reflect real edits) and Cancel discards.

/** One field's before/after, shown in the Apply review popup. */
export interface ProfileChange {
  label: string;
  from: string;
  to: string;
}

export interface ProfileEditState {
  isEditing: boolean;
  loading: boolean;
  saving: boolean;
  error: string;
  draft: EditableProfile | null;
  isDirty: boolean;
  /** True while the change-review popup is open (between Apply and Confirm). */
  isReviewing: boolean;
  /** The field-level changes shown in the review popup. */
  changes: ProfileChange[];
  start: () => void;
  cancel: () => void;
  /** Apply: opens the review popup (does not save yet). */
  apply: () => void;
  /** Confirm & Save from the review popup. */
  confirmSave: () => void;
  /** Close the review popup and return to editing. */
  cancelReview: () => void;
  setEmail: (value: string) => void;
  setPhone: (value: string) => void;
  setAddressField: (key: keyof EditableProfileAddress, value: string) => void;
  toggleResearchArea: (id: number) => void;
}

function sameIdSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((x) => set.has(x));
}

function buildPatch(original: EditableProfile, draft: EditableProfile): ProfilePatch {
  const patch: ProfilePatch = {};
  if (draft.personalEmail !== original.personalEmail) patch.personalEmail = draft.personalEmail;
  if (draft.phone !== original.phone) patch.phone = draft.phone;
  const addressKeys = Object.keys(draft.address) as (keyof EditableProfileAddress)[];
  if (addressKeys.some((k) => draft.address[k] !== original.address[k])) {
    patch.address = draft.address;
  }
  if (!sameIdSet(draft.researchAreaIds, original.researchAreaIds)) {
    patch.researchAreaIds = draft.researchAreaIds;
  }
  return patch;
}

function formatAddress(a: EditableProfileAddress): string {
  const cityLine = [a.city, [a.state, a.postalCode].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  return [a.line1, a.line2, cityLine, a.country].filter(Boolean).join(", ");
}

function researchNames(ids: number[], profile: EditableProfile): string {
  return ids
    .map((id) => profile.researchAreaOptions.find((o) => o.researchAreaId === id)?.areaName ?? `#${id}`)
    .sort((a, b) => a.localeCompare(b))
    .join(", ");
}

/** Human-readable before/after list for the review popup. */
function buildChangeSummary(original: EditableProfile, draft: EditableProfile): ProfileChange[] {
  const shown = (v: string) => (v === "" ? "(empty)" : v);
  const changes: ProfileChange[] = [];
  if (draft.personalEmail !== original.personalEmail) {
    changes.push({
      label: "Personal Email",
      from: shown(original.personalEmail),
      to: shown(draft.personalEmail),
    });
  }
  if (draft.phone !== original.phone) {
    changes.push({ label: "Phone", from: shown(original.phone), to: shown(draft.phone) });
  }
  const addressKeys = Object.keys(draft.address) as (keyof EditableProfileAddress)[];
  if (addressKeys.some((k) => draft.address[k] !== original.address[k])) {
    changes.push({
      label: "Personal Address",
      from: shown(formatAddress(original.address)),
      to: shown(formatAddress(draft.address)),
    });
  }
  if (!sameIdSet(draft.researchAreaIds, original.researchAreaIds)) {
    changes.push({
      label: "Research Areas",
      from: shown(researchNames(original.researchAreaIds, draft)),
      to: shown(researchNames(draft.researchAreaIds, draft)),
    });
  }
  return changes;
}

export function useProfileEdit(id: string, onSaved: () => void): ProfileEditState {
  const [isEditing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [original, setOriginal] = useState<EditableProfile | null>(null);
  const [draft, setDraft] = useState<EditableProfile | null>(null);
  const [isReviewing, setReviewing] = useState(false);
  const [changes, setChanges] = useState<ProfileChange[]>([]);

  const isDirty = useMemo(
    () => (original && draft ? Object.keys(buildPatch(original, draft)).length > 0 : false),
    [original, draft]
  );

  const reset = useCallback(() => {
    setDraft(null);
    setOriginal(null);
    setEditing(false);
    setReviewing(false);
    setChanges([]);
  }, []);

  const start = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const profile = await loadProfile(id);
      setOriginal(profile);
      setDraft(structuredClone(profile));
      setEditing(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const cancel = useCallback(() => {
    if (isDirty && !window.confirm("Are you sure you want to discard your changes?")) return;
    setError("");
    reset();
  }, [isDirty, reset]);

  // Apply opens the review popup (no save yet) so the editor sees exactly what
  // will change, from → to.
  const apply = useCallback(() => {
    if (!original || !draft) return;
    if (Object.keys(buildPatch(original, draft)).length === 0) {
      reset();
      return;
    }
    setError("");
    setChanges(buildChangeSummary(original, draft));
    setReviewing(true);
  }, [original, draft, reset]);

  const cancelReview = useCallback(() => setReviewing(false), []);

  const confirmSave = useCallback(async () => {
    if (!original || !draft) return;
    const patch = buildPatch(original, draft);
    if (Object.keys(patch).length === 0) {
      reset();
      return;
    }
    setSaving(true);
    setError("");
    try {
      await saveProfile(id, patch);
      reset();
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }, [id, original, draft, onSaved, reset]);

  const setEmail = useCallback(
    (value: string) => setDraft((d) => (d ? { ...d, personalEmail: value } : d)),
    []
  );
  const setPhone = useCallback(
    (value: string) => setDraft((d) => (d ? { ...d, phone: value } : d)),
    []
  );
  const setAddressField = useCallback(
    (key: keyof EditableProfileAddress, value: string) =>
      setDraft((d) => (d ? { ...d, address: { ...d.address, [key]: value } } : d)),
    []
  );
  const toggleResearchArea = useCallback(
    (rid: number) =>
      setDraft((d) => {
        if (!d) return d;
        const has = d.researchAreaIds.includes(rid);
        return {
          ...d,
          researchAreaIds: has
            ? d.researchAreaIds.filter((x) => x !== rid)
            : [...d.researchAreaIds, rid],
        };
      }),
    []
  );

  return {
    isEditing,
    loading,
    saving,
    error,
    draft,
    isDirty,
    isReviewing,
    changes,
    start,
    cancel,
    apply,
    confirmSave,
    cancelReview,
    setEmail,
    setPhone,
    setAddressField,
    toggleResearchArea,
  };
}
