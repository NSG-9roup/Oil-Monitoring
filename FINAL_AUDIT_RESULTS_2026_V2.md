# OIL MONITORING SYSTEM - UPDATED AUDIT REPORT
**Generated:** April 22, 2026  
**Project:** Oil Condition Monitoring System (OilTrack™)  
**Version:** 2.0  
**Stack:** Next.js 15.5.14 + React 19 + TypeScript 5.7 + Supabase PostgreSQL

---

## Executive Summary

| Metric | Result |
|---|---|
| Build | PASS |
| Type Check | PASS |
| Lint | PASS via build pipeline |
| Static Pages | 14/14 generated |
| Overall Readiness | Ready for staging, with targeted cleanup needed |

The project is in a materially better state than the earlier April 9 audit. The production build passes cleanly, the auth/RLS baseline is solid, and the system now includes newer customer-facing APIs for actions and user creation with rate limiting and validation.

The main remaining risk is not build stability. It is consistency and maintainability across large client components and a small number of legacy table references that can cause runtime issues even when the build is green.

---

## What Changed Since the Earlier Audit

1. The build pipeline now passes end-to-end on the current codebase.
2. New security-sensitive customer APIs are present and protected with validation and rate limiting.
3. The admin/customer data model is mostly consistent on the `oil_*` schema.
4. One notable exception remains in the profile area, where legacy table names still appear in the dashboard profile page.

Relevant current anchors:

- [Admin customer PIN API](app/api/admin/customers/pin/route.ts#L1)
- [Customer actions API](app/api/customer/actions/route.ts#L1)
- [Customer users API](app/api/customer/users/route.ts#L1)
- [Dashboard profile page](app/dashboard/profile/page.tsx#L1)
- [Dashboard profile client](app/dashboard/profile/ProfileClient.tsx#L1)

---

## Current Audit Snapshot

### 1. Authentication and Session Handling
Status: Strong

The login and session model is aligned with Supabase auth and server-side validation. Middleware and route handlers are in place, and the build confirms the auth flow is coherent under current code.

### 2. Admin Module
Status: Functional, but large and maintenance-heavy

The admin surface remains the largest and most complex part of the application. It covers customer CRUD, machine management, product management, tests, purchases, imports, alerts, and file uploads. Functionality is present and the build passes, but the module is still difficult to reason about because the main client file is doing too much.

Key strengths:

- Customer logo upload flow exists and is wired to Supabase Storage.
- Lab test PDF upload and download flows are implemented.
- Admin customer PIN management is now available through a dedicated API.
- Data loading uses the `oil_*` schema consistently in most places.

Key risks:

- `AdminClient.tsx` is a monolith and still carries a lot of form-state complexity.
- File upload paths rely on mixed form types and defensive casting.
- The code is functional, but maintainability is weaker than it should be for a large admin console.

### 3. Customer Dashboard
Status: Strong overall

The customer dashboard remains one of the best-implemented parts of the system. It covers machine views, trend charts, lab reports, and purchase history. The build proves the route is stable, and the feature set is coherent.

Main improvement area:

- Keep reducing component size and duplicated query logic so the dashboard stays maintainable as more analytics are added.

### 4. Customer Profile Area
Status: Needs attention

This is the clearest runtime-risk area I found during the audit. The page and client still query legacy table names instead of the current `oil_*` schema.

- [Dashboard profile page](app/dashboard/profile/page.tsx#L22)
- [Dashboard profile client](app/dashboard/profile/ProfileClient.tsx#L31)

Why this matters:

- The build does not catch Supabase string-query mismatches.
- This can pass compile-time checks and still fail at runtime if the legacy tables are absent or out of sync.
- It is the most actionable correctness issue in the current codebase.

### 5. API Layer
Status: Good security posture, but duplicated patterns

The API layer is better than the earlier audit suggested. New routes for customer actions and customer users include:

- session checks via Supabase server clients,
- role checks,
- Zod validation,
- payload size/rate limiting,
- service-role operations only where necessary.

The main concern is duplication. Several routes repeat the same auth, rate-limit, and JSON parsing patterns. That is acceptable now, but it will become a maintainability problem as more endpoints are added.

### 6. Database and RLS
Status: Strong

The data model is centered on the `oil_*` tables and the security model is consistent with the app structure. The current codebase uses RLS-aware patterns and secured helper functions such as role lookup and PIN verification helpers.

### 7. Performance
Status: Acceptable, with room for refinement

The current build result is healthy, and the project already has some performance-oriented changes in place. The biggest practical performance gains now will come from:

- reducing client component size,
- centralizing repeated fetch logic,
- minimizing repeated `select(*)` patterns where narrow queries are enough,
- reviewing image and report delivery paths.

---

## Security and Maintainability Audit by Module

| Module | Security | Maintainability | Notes |
|---|---:|---:|---|
| Authentication and middleware | A | B+ | Solid auth flow, good server-side checks |
| Admin console | A- | C+ | Functional but too large; upload/forms need cleanup |
| Customer dashboard | A | B | Feature-rich and coherent, but large |
| Customer profile | B | C- | Legacy table-name mismatch risk |
| API routes | A- | B- | Good validation, but duplicated boilerplate |
| Supabase schema and RLS | A | B+ | Strong foundation, good separation |

Interpretation:

- Security is generally strong across the app.
- Maintainability is the area that most needs investment, especially in large client components and repeated API patterns.

---

## Findings

### High Priority

1. Legacy schema mismatch in dashboard profile pages.
   - The profile page still queries `profiles` and `customers` instead of the current `oil_profiles` and `oil_customers` schema.
   - This is a runtime correctness issue, not a build issue.

### Medium Priority

1. Admin client is too large.
   - `AdminClient.tsx` centralizes too many responsibilities and is hard to maintain.
   - The code works, but future changes will be expensive.

2. Repeated API boilerplate.
   - Auth, rate limiting, and JSON parsing are repeated across customer/admin endpoints.
   - Shared helpers would improve consistency and reduce bugs.

3. Type safety debt in upload-heavy flows.
   - File upload and form state logic still depend on broad unions and defensive casts.
   - This is less urgent now that build passes, but it is still technical debt.

### Low Priority

1. Audit documentation drift.
   - The earlier audit is now outdated relative to the current codebase.
   - This report supersedes it.

2. Testing coverage is still mostly manual.
   - The build is healthy, but automated regression coverage remains limited.

---

## Recommended Next Actions

### Immediate

1. Fix the dashboard profile page to use the current `oil_*` schema.
2. Keep the new customer/admin API rate limiting pattern consistent across all sensitive endpoints.
3. Add a small regression test or runtime check for the profile data path.

### Short Term

1. Split `AdminClient.tsx` into smaller feature modules.
2. Extract shared API helpers for auth, rate limiting, and error responses.
3. Tighten types around file uploads and form state.

### Medium Term

1. Add automated regression coverage for the admin upload flows.
2. Add focused tests for customer APIs that enforce role and customer scoping.
3. Replace broad queries with narrower selects where the UI only needs a subset of fields.

---

## Final Verdict

The project is currently in good shape for staging. The build is passing, the security model is solid, and the core product is implemented.

The main blocker to calling it fully clean is the legacy profile-path mismatch and the maintainability debt in the large admin surface. Those are not systemic failures, but they are the highest-value fixes left.
