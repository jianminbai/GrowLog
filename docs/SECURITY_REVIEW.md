# GrowLog MVP security review

Reviewed on 2026-10-21 against commit `cd130bd` plus the M14 verification changes.

## Scope and evidence

The review covered administrator authentication, session and CSRF handling, household isolation, API validation and error envelopes, browser caching, export content, deployment boundaries, dependency advisories, and recovery controls. Evidence comes from the unit and PostgreSQL integration suites, the production build, the Compose deployment smoke test, repository searches for dynamic code execution and unsafe HTML, and `scripts/mvp-smoke.mjs` against the running Caddy endpoint.

The HTTP smoke suite verifies:

- anonymous API rejection and generic login validation errors;
- `Secure`, `HttpOnly`, and `SameSite=Lax` session-cookie attributes;
- valid sessions, missing-CSRF rejection, and cross-origin mutation rejection;
- field-level validation errors with a consistent `{ error: { code, message, fields? } }` envelope;
- authenticated create, query, update, soft-delete, deleted-query, and restore flows for growth, sleep, meals, beverages, activity, and emotion records;
- child profile creation and editing, protected Today/History rendering, household JSON export, logout, and revoked-session rejection;
- private, no-store API cache policy.

## Controls confirmed

- There is no public registration path. Password verification uses Argon2id and login failure text does not distinguish account existence.
- Session and CSRF values are random; only SHA-256 digests are stored. Session comparison is timing-safe, sessions expire, and logout revokes the database record.
- Mutations require both the session-bound CSRF token and the externally visible same origin. Caddy exposes only the application proxy; PostgreSQL and the application port remain internal to Compose.
- Every repository operation takes the authenticated household identifier. Integration tests cover cross-household reads and writes.
- Zod schemas reject unknown or invalid fields at the API boundary. Error responses expose stable codes and field names without stack traces, database details, or submitted secrets.
- Audit output and exports omit session credentials. CSV output quotes cells and neutralizes spreadsheet-formula prefixes.
- API responses are private and no-store. The service worker bypasses APIs and does not persist authenticated navigations.
- Backups are mode-restricted, checksummed, and restored into a separately named database by default. Primary replacement requires an explicit override.
- Repository search found no `eval`, dynamic `Function`, child-process execution, unsafe HTML rendering, debug logging, or unresolved TODO/FIXME markers in application code.

## Dependency audit

`npm audit --omit=dev --json` reports no critical findings, one moderate package finding, and five high package findings across six dependency nodes. Automatic remediation requires breaking major upgrades to Prisma 7.10.1 and Next.js 16.4.2.

| Advisory area | Current path | Exposure in GrowLog MVP | Disposition |
| --- | --- | --- | --- |
| `deepmerge-ts` recursive-graph stack exhaustion | Prisma CLI configuration | The CLI reads checked-in schema/config and operator environment values during image build or migration. No request data reaches its merge input. | Track the Prisma 7 migration; do not force a breaking upgrade during the verified MVP release. |
| `effect` async context contamination with concurrent RPC | Prisma CLI configuration | GrowLog does not use Effect RPC. The package is reached through Prisma's command-line configuration path. | Track the Prisma 7 migration. |
| bundled PostCSS source-map file reads and style serialization | Next.js build tooling | Production builds process checked-in CSS. Users cannot upload CSS, source maps, or style source for PostCSS to transform. | Track the Next.js 16 migration. |

These findings remain present in the lockfile and must be rechecked whenever the deployment accepts untrusted build inputs or after either framework upgrade. The accepted MVP risk is limited to trusted build/migration inputs; it does not waive future dependency maintenance.

## Follow-up

Upgrade Prisma and Next.js in isolated maintenance changes, apply their migration guides, rerun the full PostgreSQL lifecycle suite and Docker recovery smoke, then require `npm audit --omit=dev` to have no high or critical findings before closing the follow-up task.
