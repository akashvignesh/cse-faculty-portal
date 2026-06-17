"""
Export the live MySQL schema (columns, foreign keys, views) for every
app database, so the schema can be committed and read as a knowledge base.

Connection details are read from the project's .env.local (the same
credentials the app uses) — nothing is hardcoded. Open the SSH tunnel first:

    ssh -L 3307:oceanus:3306 <user>@cerf.cse.buffalo.edu

Then run:

    pip install -r scripts/db-schema/requirements.txt
    python scripts/db-schema/export_schema.py

Output is written to scripts/db-schema/data/.
"""

import csv
import os
from datetime import datetime

import mysql.connector

# ─────────────────────────────────────────
# PATHS
# ─────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
OUTPUT_FOLDER = os.path.join(SCRIPT_DIR, "data")
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# Databases to export (the application schemas — skips information_schema,
# mysql, performance_schema, sys, which are noise).
DATABASES = [
    "budget",
    "committees",
    "courses",
    "dce",
    "ent",
    "facilities",
    "lok",
    "network",
    "people",
    "ps_rpt",
    "research",
    "sunycard",
    "ubs_emp",
    "ubs_rf",
]


# ─────────────────────────────────────────
# CONFIG — read from .env.local (fallback .env)
# ─────────────────────────────────────────
def load_env_file(path):
    """Minimal .env parser — no external dependency required."""
    values = {}
    if not os.path.exists(path):
        return values
    with open(path, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            val = val.strip().strip('"').strip("'")
            values[key.strip()] = val
    return values


def get_db_config():
    env = {}
    # .env.local wins, then .env, then the process environment.
    for name in (".env", ".env.local"):
        env.update(load_env_file(os.path.join(PROJECT_ROOT, name)))
    env.update({k: v for k, v in os.environ.items() if k.startswith("DB_")})

    user = env.get("DB_USER")
    password = env.get("DB_PASSWORD")
    if not user or not password:
        raise SystemExit(
            "DB_USER / DB_PASSWORD not found. Fill them in .env.local "
            "(FACULTY_DATA_MODE=db) and make sure the SSH tunnel is open."
        )

    return {
        "host": env.get("DB_HOST", "127.0.0.1"),
        "port": int(env.get("DB_PORT", "3307")),
        "user": user,
        "password": password,
    }


# ─────────────────────────────────────────
# QUERIES
# ─────────────────────────────────────────
COLUMNS_QUERY = """
SELECT
    TABLE_SCHEMA        AS `Database`,
    TABLE_NAME          AS `Table`,
    ORDINAL_POSITION    AS `Col #`,
    COLUMN_NAME         AS `Column`,
    COLUMN_TYPE         AS `Data Type`,
    IS_NULLABLE         AS `Nullable`,
    COLUMN_KEY          AS `Key`,
    COLUMN_DEFAULT      AS `Default`,
    EXTRA               AS `Extra`,
    CHARACTER_SET_NAME  AS `Charset`,
    COLLATION_NAME      AS `Collation`,
    COLUMN_COMMENT      AS `Comment`
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = %s
ORDER BY TABLE_NAME, ORDINAL_POSITION;
"""

FOREIGN_KEYS_QUERY = """
SELECT
    TABLE_SCHEMA            AS `Database`,
    TABLE_NAME              AS `Table`,
    COLUMN_NAME             AS `Column`,
    CONSTRAINT_NAME         AS `Constraint`,
    REFERENCED_TABLE_SCHEMA AS `Ref Database`,
    REFERENCED_TABLE_NAME   AS `Ref Table`,
    REFERENCED_COLUMN_NAME  AS `Ref Column`
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = %s
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, ORDINAL_POSITION;
"""

VIEWS_QUERY = """
SELECT
    TABLE_SCHEMA    AS `Database`,
    TABLE_NAME      AS `View`,
    VIEW_DEFINITION AS `Definition`
FROM information_schema.VIEWS
WHERE TABLE_SCHEMA = %s
ORDER BY TABLE_NAME;
"""


def fetch(cursor, query, db):
    cursor.execute(query, (db,))
    return cursor.fetchall()


def write_csv(path, rows):
    if not rows:
        return
    with open(path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


# ─────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────
def main():
    config = get_db_config()
    print("Connecting to MySQL at {host}:{port} ...".format(**config))
    try:
        conn = mysql.connector.connect(**config)
        cursor = conn.cursor(dictionary=True)
        print("Connected.\n")
    except mysql.connector.Error as e:
        raise SystemExit(
            "Connection failed: {}\n"
            "Is the SSH tunnel open? "
            "ssh -L 3307:oceanus:3306 <user>@cerf.cse.buffalo.edu".format(e)
        )

    all_columns = []
    all_fks = []
    all_views = []
    summary = []

    for db in DATABASES:
        print("Exporting {} ...".format(db), end=" ")
        try:
            cols = fetch(cursor, COLUMNS_QUERY, db)
            fks = fetch(cursor, FOREIGN_KEYS_QUERY, db)
            views = fetch(cursor, VIEWS_QUERY, db)
        except mysql.connector.Error as e:
            summary.append({"Database": db, "Tables": 0, "Columns": 0,
                            "FKs": 0, "Views": 0, "Status": "Error: {}".format(e)})
            print("error: {}".format(e))
            continue

        all_columns.extend(cols)
        all_fks.extend(fks)
        all_views.extend(views)

        table_count = len({r["Table"] for r in cols})
        summary.append({
            "Database": db,
            "Tables": table_count,
            "Columns": len(cols),
            "FKs": len(fks),
            "Views": len(views),
            "Status": "OK" if cols else "Empty / No Access",
        })
        print("{} tables, {} cols, {} FKs, {} views".format(
            table_count, len(cols), len(fks), len(views)))

    cursor.close()
    conn.close()

    # Stable filenames (overwritten each run) so the repo always has the
    # latest, plus a timestamped copy for history.
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    write_csv(os.path.join(OUTPUT_FOLDER, "columns.csv"), all_columns)
    write_csv(os.path.join(OUTPUT_FOLDER, "foreign_keys.csv"), all_fks)
    write_csv(os.path.join(OUTPUT_FOLDER, "views.csv"), all_views)
    write_csv(os.path.join(OUTPUT_FOLDER, "summary.csv"), summary)
    write_csv(os.path.join(OUTPUT_FOLDER, "columns_{}.csv".format(stamp)), all_columns)

    # One CSV per database for easy targeted reading.
    per_db_dir = os.path.join(OUTPUT_FOLDER, "by-database")
    os.makedirs(per_db_dir, exist_ok=True)
    for db in DATABASES:
        rows = [r for r in all_columns if r["Database"] == db]
        write_csv(os.path.join(per_db_dir, "{}.csv".format(db)), rows)

    print("\nDone. Output in:", OUTPUT_FOLDER)
    print("\nSummary:")
    print("  {:<14} {:>7} {:>8} {:>5} {:>6}  {}".format(
        "Database", "Tables", "Columns", "FKs", "Views", "Status"))
    for s in summary:
        print("  {Database:<14} {Tables:>7} {Columns:>8} {FKs:>5} {Views:>6}  {Status}".format(**s))


if __name__ == "__main__":
    main()
