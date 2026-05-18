# API Route Invariants (enforced)

These are enforced automatically by `scripts/check-route-invariants.mjs`, run as
`npm test`, by the `.githooks/pre-commit` hook, and in CI (`.github/workflows/ci.yml`).
A violation **fails the build** — it is not a manual audit.

Per exported HTTP handler in `src/app/api/**/route.ts`:

- **(a)** If the handler uses `prisma.$transaction`, every `auditLog.create` must be
  *inside* it (callback or array form). A crash between commit and a separate audit
  write would otherwise drop the audit row.
- **(b)** A write handler (POST/PUT/PATCH/DELETE) that calls `parseJsonBody` must call
  `enforceMaxBodySize` *before* it.
- **(c)** No raw `<request>.json()` — use `parseJsonBody`.
- **(d)** Write handlers must call `rateLimit`.
- **(e)** When county is in scope (`requireCountyAccess` / `assertApplicantInCounty`),
  `auditLog.create` data must include `countyId`.

## Reviewed exceptions

A genuine exception uses `// invariant-ignore: <reason>` on the violation line or the
line directly above. The reason is mandatory (an empty one is itself a violation) and is
surfaced in `npm run check:routes -- --report`. Current exceptions: `auth/logout` and
`cron/check-overdue` rate-limit (see their inline reasons).

## Why this replaces the audit-pass treadmill

`docs/audit-pass-*.md` were manual route×invariant walks: stale on any code change and
the source of false positives (e.g. flagging `countyId` on routes that already had it).
This checker is per-handler precise and executable. The authoritative current state is
`npm run check:routes -- --report`, not a markdown file. Historical audit-pass docs are
kept only as a record.

## Follow-up (not yet done)

The deeper fix is a shared route wrapper so the ceremony *cannot* be hand-omitted at all;
this gate makes that migration safe to do incrementally without regressions.
