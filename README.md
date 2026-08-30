# CSE Faculty Portal

Full-stack TypeScript Next.js (App Router) application for the UB CSE
department faculty portal: faculty roster and profiles, teaching history,
course-preference planning (with per-year faculty roles that drive teaching-load
release), committee assignment management, editable leave records, and course
area tags that supplement the catalog.

The app is self-contained — its own API routes (under `/api`) replace the
former Spring Boot backend. Editable tables are served through the
[DataTables Editor server library](https://editor.datatables.net) protocol
(server library only; no client license required — all editing UIs are
custom React).

## Stack

- Next.js 15 (App Router) + React 19, TypeScript strict
- knex + mysql2 against the university MySQL (via SSH tunnel)
- `datatables.net-editor-server` for validated CRUD on the `cfp_*` tables
- jQuery DataTables (display-only) for sortable/exportable tables
- Vitest + Testing Library, ESLint, Prettier

## Run

```bash
npm install
cp .env.example .env.local   # then edit as needed
npm run dev
```

Open `http://localhost:3000`. With the default `FACULTY_DATA_MODE=local` the
portal runs fully offline against bundled mock data — no database needed.

### Scripts

| Script              | Purpose                    |
| ------------------- | -------------------------- |
| `npm run dev`       | Dev server                 |
| `npm run build`     | Production build           |
| `npm run start`     | Serve the production build |
| `npm run typecheck` | `tsc --noEmit`             |
| `npm run lint`      | ESLint                     |
| `npm run test`      | Vitest (unit + component)  |
| `npm run format`    | Prettier write             |

## Data modes

`FACULTY_DATA_MODE` (server-side, in `.env.local`) selects the data source:

- **`local`** (default) — bundled mock data served through the same HTTP API
  routes the database mode uses. Editable (Editor) routes answer `503`; the
  editing UIs fall back to non-persistent mock behavior.
- **`db`** — the university MySQL server. Requires the SSH tunnel and
  credentials:

```bash
# 1. Open the tunnel (port 3307 -> oceanus:3306)
ssh -L 3307:oceanus:3306 <user>@cerf.cse.buffalo.edu

# 2. .env.local
FACULTY_DATA_MODE=db
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=...        # never commit credentials
DB_PASSWORD=...
DB_DATABASE=ubs_emp
DEV_USERID=...     # acts as the signed-in user until real auth lands
DEV_ROLE=...       # optional: force the RBAC role (chair|staff|faculty|viewer)
```

If the tunnel is down, API routes answer `503` with a clear message instead
of hanging.

## Documentation

- [`docs/business-logic.md`](docs/business-logic.md) — every domain rule the
  portal encodes: faculty types & load, role releases, semester planning &
  validation, the 0–5 (NQ) preference scale, academic-year locking, biannual
  carry-forward, leaves, the committee matrix, and area tags.
- [`docs/sql-reference.md`](docs/sql-reference.md) — every database call: where
  it lives, what it touches, how to add a field at each layer.
- [`docs/api-sql-flowchart.md`](docs/api-sql-flowchart.md) — request → route →
  query → table flow.
- [`docs/deployment.md`](docs/deployment.md) — Docker / self-hosted-runner
  deploy on a2il-01.

## Architecture

```
src/
├── app/                  # App Router: 5 UI routes + API route handlers
│   │                     #   (roster, faculty detail, committee-preference,
│   │                     #    course-preference, course-tags)
│   └── api/
│       ├── v1/           # REST reads (faculty, teaching history/prefs,
│       │                 #   committees, courses) — Java-backend-compatible
│       └── editor/       # DataTables Editor protocol for editable cfp_* tables
│                         #   (committee-*, course-plan, semester-plan,
│                         #    faculty-role, faculty-leave, area-tag-master,
│                         #    course-area-tag, service-*)
├── components/           # React UI (faculty-detail/, course-preference/,
│                         #   committee-preference/, DataTableView, …)
├── services/             # Typed client fetchers (browser side)
├── server/
│   ├── queries/          # knex SQL (ports of the Java repositories)
│   ├── mocks/            # local-mode implementation of the same contract
│   └── data/             # mode dispatcher
├── lib/                  # env (zod-validated), db (knex singleton), auth seam,
│                         #   term codes, editor protocol helpers, formatters
├── data/                 # bundled mock datasets
└── types/                # domain model + API envelopes
```

Key invariants:

- **Write allowlist** — only eight `ubs_emp.cfp_*` tables are writable through
  the Editor protocol (the `WRITABLE_TABLES` set in `src/lib/db.ts`, enforced
  in `src/lib/editor/factory.ts`): course/semester plan, faculty role, service
  categories/summary, the two area-tag tables, plus the pre-existing
  `cfp_faculty_leave`, which the leave editor writes. Two cross-schema tables
  accept DML via plain knex: `people.cfp_faculty_teaching_prefs` (teaching
  preferences) and `committees.members` (the committee matrix's storage — the
  old parallel `cfp_committee_assignment` table is retired, while
  `cfp_committee_catalog` lives on as the matrix's column-metadata overlay).
  All other university tables (`committees.committees`,
  `people.*`, `ps_rpt.*`, `dce.*`, the pre-existing `cfp_faculty`) are
  read-only by ground rule.
- **Identity bridge** — course plans key on `person_number`; committee
  assignments and teaching preferences key on `userid`. `dce.person_number`
  maps between them (`src/server/queries/identity.ts`). API routes accept
  either identifier.
- **Audit stamping** — every write sets `editor` (userid) and `dt`; `ts` is
  DB-managed. The current user comes from the `getSession()` seam in
  `src/lib/auth.ts` (dev cookie → `DEV_USERID` until SSO lands).
- **RBAC** — four roles (`chair`, `staff`, `faculty`, `viewer`) with a single
  boolean `ACCESS` grid in `src/lib/permissions.ts` shared by the server guard
  (`src/lib/editor/rbac.ts`, attached to every Editor route) and the client
  context (`src/components/auth/AuthProvider.tsx`). Committee management is
  chair-only (writes *and* reads — see `docs/business-logic.md` §12); staff
  edits everything else department-wide; faculty edits only their own rows;
  viewer is read-only. Roles live in `ubs_emp.cfp_user_role`
  (mock: `src/data/userRoleMockData.ts`); a roster member without a row
  defaults to `faculty`, everyone else to `viewer`. Enforcement is
  server-side (403); UI hiding is UX only. The chair manages assignments on
  `/user-roles`; a lockout guard rejects any change that would leave zero
  chairs (assign the new chair first, then step down). A dev-only role
  switcher (bottom-right widget, `/api/dev/impersonate`) is available
  outside production for testing each role.
- **Term codes** — `[century][YY][term]` with century digit `+18`
  (Fall 2025 = `2259`); helpers and tests in `src/lib/term.ts`.

## Database migrations & seed

All SQL lives under `db/` and is applied **manually** (dev first, never at app
startup). The structural migration opens with `DROP TABLE`s — re-running wipes
all plan/assignment/role/tag data — and the seed is **not idempotent**, so the
correct apply order is:

```bash
T="-h 127.0.0.1 -P 3307 -u <user> -p"   # tunnel must be open

# 1. Structural: creates the app cfp_* tables — course/semester plan, faculty
#    role, the committee tables, service categories/summary, and the area-tag
#    master (seeded AI/Systems/PL/Theory/Special Topics) + course→tag mapping.
mysql $T < db/migration/faculty_portal_db_changes.sql
# 2. Remove any prior seed rows (the seed is not idempotent).
mysql $T < db/seed/test_faculty_unseed.sql
# 3. Widen people.cfp_faculty_teaching_prefs.pref CHECK from 0–4 to 0–5
#    (the UI/API rating scale is 0..5 — 0 = Not Qualified).
mysql $T < db/migration/widen_teaching_pref_check.sql
# 4. (Re-runnable) seed the five leadership "Roles" matrix columns into
#    committees.committees (cms_display=0) so their marks can be stored in
#    committees.members with every other matrix cell.
#    MUST precede the seed — step 5 resolves those columns by name.
mysql $T < db/migration/seed_leadership_committees.sql
# 5. Seed five test faculty across every table the portal reads/edits.
mysql $T < db/seed/test_faculty_seed.sql
```

On a database seeded before the committee-matrix rewrite, the leadership
holders are still stranded in the retired `cfp_committee_assignment`, so the
matrix's leadership row renders empty. Move them across once — review the
names first, since on oceanus they came from the seed rather than the
department:

```bash
mysql $T < db/migration/backfill_leadership_members.sql
```

> Collation note for any new cross-schema script: oceanus' server default is
> `utf8mb4_unicode_ci` but the `cfp_*` tables are `utf8mb4_0900_ai_ci`. Start
> such scripts with `SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;` (see
> `autofill_committee_assignments.sql`).

DB-gated integration tests (require tunnel + migrations applied to a dev DB):

```powershell
$env:RUN_DB_TESTS="1"; $env:FACULTY_DATA_MODE="db"; npx vitest run tests/api
```

## Security caveats

- **No real authentication yet.** Every request acts as `DEV_USERID` (or the
  dev-switcher cookie). Authorization *is* enforced — mutating endpoints
  check the RBAC matrix and row ownership server-side — but identity is not
  verified, so do not expose beyond the department network until
  SSO/Shibboleth is integrated at the `getSession()` seam in `src/lib/auth.ts`.
- Request a dedicated MySQL account (SELECT on university schemas, DML only
  on `ubs_emp.cfp_*`) instead of a personal account — defense in depth on
  top of the app-level allowlist.
- Never import `datatables.net-editor` (the client library) — it is
  commercial and unlicensed here. Only `datatables.net-editor-server` is
  used, and only on the server.

## Decommissioning the Java backend

The former Spring Boot service (`faculty-portal-backend`) is replaced by
this app's `/api/v1` routes (wire-compatible envelopes). Before shutting it
down, diff a few endpoints side by side with the tunnel up, e.g.:

```bash
curl "http://localhost:3000/api/v1/faculty?page=0&size=10&search=smith"
curl "http://localhost:8080/api/v1/faculty?page=0&size=10&search=smith"
```

Known intentional deviations: teaching preferences use the numeric 0..5
scale with `termCode` threading (per the DB change script) instead of the
legacy `preference1/2/3` labels, and list items include `userid`.
