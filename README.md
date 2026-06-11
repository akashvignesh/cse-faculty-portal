# CSE Faculty Portal

Full-stack TypeScript Next.js (App Router) application for the UB CSE
department faculty portal: faculty roster and profiles, teaching history,
course-preference planning, and committee assignment management.

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
├── app/                  # App Router: 4 UI routes + API route handlers
│   └── api/
│       ├── v1/           # REST reads (faculty, teaching history/prefs,
│       │                 #   committees, courses) — Java-backend-compatible
│       └── editor/       # DataTables Editor protocol for editable cfp_* tables
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

- **Write allowlist** — only the six new `ubs_emp.cfp_*` tables are writable
  (enforced in `src/lib/db.ts` / `src/lib/editor/factory.ts`). All other
  university tables (`committees.*`, `people.*`, `ps_rpt.*`, `dce.*`, the
  pre-existing `cfp_faculty`) are read-only by ground rule. Exception:
  `people.cfp_faculty_teaching_prefs` accepts DML via plain knex.
- **Identity bridge** — course plans key on `person_number`; committee
  assignments and teaching preferences key on `userid`. `dce.person_number`
  maps between them (`src/server/queries/identity.ts`). API routes accept
  either identifier.
- **Audit stamping** — every write sets `editor` (userid) and `dt`; `ts` is
  DB-managed. The current user comes from the `getCurrentUser()` seam in
  `src/lib/auth.ts` (returns `DEV_USERID` until SSO lands).
- **Term codes** — `[century][YY][term]` with century digit `+18`
  (Fall 2025 = `2259`); helpers and tests in `src/lib/term.ts`.

## Database migration

`db/migration/faculty_portal_db_changes.sql` creates the six `cfp_*` tables
and seed data. **The script opens with `DROP TABLE`s** — re-running wipes all
plan/assignment data. Apply manually, dev first, never at app startup:

```bash
mysql -h 127.0.0.1 -P 3307 -u <user> -p < db/migration/faculty_portal_db_changes.sql
```

Before wiring teaching-preference writes in production, verify
`people.cfp_faculty_teaching_prefs.pref` has no leftover `CHECK (0..4)`
constraint (the UI scale is 0..5).

DB-gated integration tests (require tunnel + migration applied to a dev DB):

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
