# Test accounts — one per role

Seeded by `db/seed/test_user_roles_seed.sql` (roles) on top of
`db/seed/test_faculty_seed.sql` (five full faculty records). Every account is a
real roster faculty so each role can be exercised end-to-end against real data.

## How to log in as a role

There is no real login yet (UB SSO/Shibboleth is pending). Use the **dev role
switcher** — the small `DEV: <user> (<role>)` widget in the bottom-right corner
(enabled in every non-production build):

1. Click the widget.
2. Type the **userid** below (leave **role** blank to use the seeded role, or
   pick a role to force it).
3. Apply — the page reloads acting as that user.

The default identity (no cookie) is `asureshk`, seeded as **chair**.

## The accounts

| Userid | Role | Person # | What they can do |
| ------ | ---- | -------- | ---------------- |
| `alphonce` | **chair** | 28010859 | Edit **any** faculty's profile; committee management + matrix; role management (`/user-roles`); everything. |
| `kdantu` | **staff** | 37912425 | Edit **any** faculty's profile, leave, course plans, roles, tags; **manage users** on `/user-roles` (but cannot appoint/remove a **chair**); **cannot** touch committee management. |
| `chandola` | **faculty** | 37912417 | Edit **only their own** profile (contact + research) and own course/committee preferences; everything else read-only. |
| `changyou` | **viewer** | 38071471 | **Read-only** everywhere — no Edit buttons at all. (A test designation; a real viewer is usually a non-faculty account.) |
| `eblanton` | faculty (fallback) | 38093483 | Same as `chandola` — has **no** `cfp_user_role` row, so it resolves to `faculty` via the roster fallback (proves the default path). |

The dev account `asureshk` (chair, `editor='SEED'`) comes from the migration and
stays until SSO replaces `DEV_USERID`.

## Quick profile-edit test per role

Open any faculty profile (`/faculty/<userid>`) and look at the **Edit Profile**
button beside the name:

- **`alphonce` / `kdantu`** — Edit Profile shows on every profile. Enter edit
  mode, click a pencil, change a field, **Apply** → review popup (from → to) →
  **Confirm & Save**. Leave tab is editable in edit mode.
- **`chandola` / `eblanton`** — Edit Profile shows **only on their own**
  profile; other profiles have no Edit button and the API 403s a forced edit.
  Leave stays read-only (faculty cannot edit leave).
- **`changyou`** — no Edit Profile button anywhere; everything read-only.

## Testing roles on a DEPLOYED test server (no SSO yet)

The dev switcher is the way to test all roles before UB SSO exists — on your own
machine *and* on a deployed test/staging box. It is off by default in a
production build; enable it with env vars on the server:

```bash
AUTH_DEV_SWITCHER=1                 # turn the switcher on in a production build
AUTH_DEV_SWITCHER_SECRET=<key>      # STRONGLY recommended: gate it with a shared key
```

Then, on the deployed site, open the **DEV: …** widget (bottom-right):

1. Enter the **test-access key** once (remembered for the browser session).
2. Use the **quick test as… chair / staff / faculty / viewer** buttons for a
   one-click role switch, or type a specific `userid` + role. To test a faculty
   editing *their own* profile, type a real faculty userid (e.g. `chandola`).

`/api/dev/impersonate` returns **403** without the correct key, so the switcher
isn't usable by random visitors who find the test URL.

> ⚠️ **Security.** With `AUTH_DEV_SWITCHER=1` and **no** key (and no other
> protection), anyone who opens the site can make themselves **chair**. Only run
> the switcher on a **locked-down** test environment — set the key, and/or put
> the whole site behind VPN / HTTP basic-auth / an IP allowlist. **Never** enable
> it on a production deployment holding real data. When real SSO lands, drop
> both env vars and the switcher disappears.

## Re-seeding

```powershell
# with the 3307 tunnel up and FACULTY_DATA_MODE=db credentials in the shell
mysql ... < db/seed/test_user_roles_unseed.sql   # remove SEEDTEST role rows
mysql ... < db/seed/test_user_roles_seed.sql      # re-add them
```

(The migration-seeded `asureshk=chair` row is `editor='SEED'` and is left
untouched by the unseed.)
