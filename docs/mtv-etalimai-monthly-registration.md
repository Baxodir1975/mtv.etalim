# mtv-etalimai: monthly listener registration

## User flow

- The ordinary form shows four white summary cells: year, month, category and group. Draft values follow the training start date and selected course.
- After a successful save, the server-confirmed cohort is fixed. Ko‘rish refreshes only that cohort.
- “Boshqa oy uchun ro‘yxatdan o‘tish” opens a separate registration draft. The old record and binding remain intact until the new registration succeeds. Cancelling returns to the existing cohort.
- Re-registration on a bound device uses the existing phone. A different start-date year/month is required. A new photo and the required fields must be supplied.
- One active record is allowed per normalized phone and start-date year/month, regardless of category, group or day. Another month or year is allowed. This rule also applies to administrator writes.
- Existing records/files are never overwritten by the new-period action. Ordinary edits retain their server-side cohort. Admin access remains restricted to the existing protected route.

## Database

Migration: `db/migrations/0007_mtv_etalimai_monthly_phone.sql`.

Target: existing Neon project `small-cherry-71874051`, production branch `br-fragrant-sky-b2wrvm0g`, database `neondb`.

The migration replaces the cohort-wide phone index with `listeners_active_month_phone_uidx`, keyed by phone and the year/month extracted from `start_date`. It is transactional, changes no listener/file rows, and rolls back if historical duplicates prevent index creation. Preflight on 2026-09-05: 38 total and active listeners, zero duplicate phone-month combinations.

## Verification

65 tests cover the real form and API with mocked network/database data, including draft summaries, successful/failed re-registration, locked editing, cross-group duplicate rejection, unique-constraint conflicts, cancellation, ordinary/admin isolation and cohort refresh.

A PostgreSQL temporary-table test additionally rejects a same-month duplicate with a different day/group, accepts a different month/year and a different phone, and removes itself at commit. No test registrations are inserted into the production listeners table.

Build verification: `npm run check` (lint, TypeScript, production build).

Canonical repository: `moliya-svg/mtv.etalim`. Existing Cloudflare Worker: `mtv-etalimai`. Public form: https://mtv.etalimai.uz/?section=form

The existing device-cookie lifetime and recovery limitations are unchanged; this does not add SMS identity verification or cross-device account login.
