import "server-only";
import { getDb } from "@/lib/db";
import { BadRequestError, NotFoundError } from "@/lib/api/errors";
import type { ProfilePatch } from "@/lib/api/profileSchema";
import type { EditableProfile, EditableProfileAddress } from "@/server/data/types";
import { resolvePersonNumber } from "./identity";

// Read + write for the editable faculty profile (department-owned cfp_* contact
// tables + research areas). All writes go through knex parameter binding — no
// string interpolation of payload values into SQL — and stamp editor/dt for
// audit. The primary-contact tables are one-row-per-person (PK person_number),
// so a write is an upsert; an emptied field deletes the row.
//
// NOTE (deployment): these tables must be excluded from the university→CS
// batch load, or edits here will be overwritten on the next sync.

const EMPTY_ADDRESS: EditableProfileAddress = {
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

async function readProfile(
  db: ReturnType<typeof getDb>,
  personNumber: string
): Promise<EditableProfile> {
  const [email, phone, address, selected, options] = await Promise.all([
    db("cfp_faculty_primary_email")
      .where("person_number", personNumber)
      .first<{ email_address: string } | undefined>(),
    db("cfp_faculty_primary_phone_number")
      .where("person_number", personNumber)
      .first<{ phone_number: string } | undefined>(),
    db("cfp_faculty_primary_address")
      .where("person_number", personNumber)
      .first<Record<string, string | null> | undefined>(),
    db("cfp_faculty_research_areas")
      .where("person_number", personNumber)
      .pluck<number[]>("research_area_id"),
    db("cfp_research_area_master")
      .select("research_area_id as researchAreaId", "area_name as areaName")
      .orderBy("area_name", "asc"),
  ]);

  return {
    personalEmail: email?.email_address ?? "",
    phone: phone?.phone_number ?? "",
    address: address
      ? {
          line1: address.address_line1 ?? "",
          line2: address.address_line2 ?? "",
          city: address.city ?? "",
          state: address.state_province ?? "",
          postalCode: address.postal_code ?? "",
          country: address.country ?? "",
        }
      : { ...EMPTY_ADDRESS },
    researchAreaIds: selected.map(Number),
    researchAreaOptions: options.map((o) => ({
      researchAreaId: Number(o.researchAreaId),
      areaName: o.areaName,
    })),
  };
}

export async function getFacultyProfile(idOrUserid: string): Promise<EditableProfile | null> {
  const personNumber = await resolvePersonNumber(idOrUserid);
  if (!personNumber) return null;
  return readProfile(getDb(), personNumber);
}

export async function saveFacultyProfile(
  idOrUserid: string,
  patch: ProfilePatch,
  editor: string
): Promise<EditableProfile> {
  const db = getDb();
  const personNumber = await resolvePersonNumber(idOrUserid);
  if (!personNumber) {
    throw new NotFoundError(`No faculty record found for ${idOrUserid}`);
  }

  await db.transaction(async (trx) => {
    const now = trx.fn.now();

    if (patch.personalEmail !== undefined) {
      const value = patch.personalEmail.trim();
      if (value === "") {
        await trx("cfp_faculty_primary_email").where("person_number", personNumber).delete();
      } else {
        await trx("cfp_faculty_primary_email")
          .insert({ person_number: personNumber, email_address: value, editor, dt: now })
          .onConflict("person_number")
          .merge({ email_address: value, editor, dt: now });
      }
    }

    if (patch.phone !== undefined) {
      const value = patch.phone.trim();
      if (value === "") {
        await trx("cfp_faculty_primary_phone_number")
          .where("person_number", personNumber)
          .delete();
      } else {
        await trx("cfp_faculty_primary_phone_number")
          .insert({ person_number: personNumber, phone_number: value, editor, dt: now })
          .onConflict("person_number")
          .merge({ phone_number: value, editor, dt: now });
      }
    }

    if (patch.address !== undefined) {
      const a = patch.address;
      const anyFilled = [a.line1, a.line2, a.city, a.state, a.postalCode, a.country].some(
        (v) => v.trim() !== ""
      );
      if (!anyFilled) {
        await trx("cfp_faculty_primary_address").where("person_number", personNumber).delete();
      } else {
        const row = {
          person_number: personNumber,
          address_line1: a.line1.trim(),
          address_line2: a.line2.trim() || null,
          city: a.city.trim() || null,
          state_province: a.state.trim() || null,
          postal_code: a.postalCode.trim() || null,
          country: a.country.trim() || null,
          editor,
          dt: now,
        };
        await trx("cfp_faculty_primary_address")
          .insert(row)
          .onConflict("person_number")
          .merge({
            address_line1: row.address_line1,
            address_line2: row.address_line2,
            city: row.city,
            state_province: row.state_province,
            postal_code: row.postal_code,
            country: row.country,
            editor,
            dt: now,
          });
      }
    }

    if (patch.researchAreaIds !== undefined) {
      const requested = [...new Set(patch.researchAreaIds)];
      if (requested.length > 0) {
        // Reject ids that are not in the master vocabulary (no foreign ids).
        const validRows = await trx("cfp_research_area_master")
          .whereIn("research_area_id", requested)
          .pluck<number[]>("research_area_id");
        const valid = new Set(validRows.map(Number));
        const invalid = requested.filter((id) => !valid.has(id));
        if (invalid.length > 0) {
          throw new BadRequestError(`Unknown research area id(s): ${invalid.join(", ")}`);
        }
      }

      const currentRows = await trx("cfp_faculty_research_areas")
        .where("person_number", personNumber)
        .pluck<number[]>("research_area_id");
      const current = new Set(currentRows.map(Number));
      const requestedSet = new Set(requested);
      const toAdd = requested.filter((id) => !current.has(id));
      const toRemove = [...current].filter((id) => !requestedSet.has(id));

      if (toRemove.length > 0) {
        await trx("cfp_faculty_research_areas")
          .where("person_number", personNumber)
          .whereIn("research_area_id", toRemove)
          .delete();
      }
      if (toAdd.length > 0) {
        await trx("cfp_faculty_research_areas").insert(
          toAdd.map((id) => ({
            person_number: personNumber,
            research_area_id: id,
            editor,
            dt: now,
          }))
        );
      }
    }
  });

  return readProfile(db, personNumber);
}
