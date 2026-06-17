# DB schema export

Dumps the live MySQL schema (columns, foreign keys, view definitions) for every
application database into [`data/`](data/), so the schema can be committed and
used as a knowledge base for understanding what tables/columns the portal works
against.

## What it reads

Credentials come from the project's `.env.local` (the same `DB_*` variables the
app uses) — **nothing is hardcoded**. The university DB is reached over an SSH
tunnel, so open that first.

## Run it

```bash
# 1. Open the tunnel (from the project root .env.example)
ssh -L 3307:oceanus:3306 <user>@cerf.cse.buffalo.edu

# 2. Make sure .env.local has DB_USER / DB_PASSWORD set (FACULTY_DATA_MODE=db)

# 3. Install the one dependency and run
pip install -r scripts/db-schema/requirements.txt
python scripts/db-schema/export_schema.py
```

## Output (`scripts/db-schema/data/`)

| File | Contents |
|------|----------|
| `columns.csv` | Every column in every app DB: type, nullable, key (PRI/UNI/MUL), default, charset, collation, comment |
| `foreign_keys.csv` | Declared FK relationships (legacy DBs may have none — that's expected) |
| `views.csv` | View definitions (e.g. `ps_rpt.ub_display_name_v`) |
| `summary.csv` | Per-database table/column/FK/view counts |
| `by-database/<db>.csv` | Columns split per schema for targeted reading |
| `columns_<timestamp>.csv` | Timestamped snapshot for history |

Re-running overwrites the stable files and adds a new timestamped snapshot.

## Databases covered

`budget`, `committees`, `courses`, `dce`, `ent`, `facilities`, `lok`,
`network`, `people`, `ps_rpt`, `research`, `sunycard`, `ubs_emp`, `ubs_rf`
