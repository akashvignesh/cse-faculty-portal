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
DEV_USERID=...     # stamped into cfp_* audit columns until real auth lands
```

If the tunnel is down, API routes answer `503` with a clear message instead
of hanging.

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

- **Write allowlist** — only ten `ubs_emp.cfp_*` tables are writable (the
  `WRITABLE_TABLES` set in `src/lib/db.ts`, also enforced in
  `src/lib/editor/factory.ts`): the nine app-created tables (course/semester
  plan, faculty role, the three committee tables, service categories/summary,
  the two area-tag tables) plus the pre-existing `cfp_faculty_leave`, which the
  leave editor now writes. All other university tables (`committees.*`,
  `people.*`, `ps_rpt.*`, `dce.*`, the pre-existing `cfp_faculty`) are read-only
  by ground rule. Exception: `people.cfp_faculty_teaching_prefs` accepts DML via
  plain knex.
- **Identity bridge** — course plans key on `person_number`; committee
  assignments and teaching preferences key on `userid`. `dce.person_number`
  maps between them (`src/server/queries/identity.ts`). API routes accept
  either identifier.
- **Audit stamping** — every write sets `editor` (userid) and `dt`; `ts` is
  DB-managed. The current user comes from the `getCurrentUser()` seam in
  `src/lib/auth.ts` (returns `DEV_USERID` until SSO lands).
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
# 4. Seed five test faculty across every table the portal reads/edits.
mysql $T < db/seed/test_faculty_seed.sql
# 5. (Optional, re-runnable) derive committee assignments from the live roster
#    and the per-year roles. Non-destructive; set @ay inside the file.
mysql $T < db/migration/autofill_committee_assignments.sql
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

- **No authentication yet.** Every request acts as `DEV_USERID`; mutating
  endpoints are unprotected. Do not expose beyond the department network
  until SSO/Shibboleth is integrated at the `getCurrentUser()` seam.
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
