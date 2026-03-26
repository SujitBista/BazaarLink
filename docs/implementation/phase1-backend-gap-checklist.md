# Phase 1 backend gap checklist

Source of truth used for this review: `docs/`, `prisma/schema.prisma`, and current Phase 1 backend implementation.

## Auth

- [ ] **Validation gaps**
  - [ ] Implement email verification endpoints (trigger + confirm) with single-use and expiry semantics.
  - [ ] Implement password reset endpoints (request + confirm) with single-use and expiry semantics.
  - [ ] Return deterministic `400` responses for malformed JSON payloads (avoid generic `500` fallback).
  - [ ] Normalize email casing/whitespace on signup/login to avoid duplicate-account edge cases.
- [ ] **Authorization gaps**
  - [ ] Re-validate role from DB for privileged operations (or invalidate stale sessions on role change).
  - [ ] Ensure role updates are reflected immediately for active sessions.
- [ ] **Response consistency**
  - [ ] Standardize error response shape (`error`, `code`, optional `details`) across auth routes.
  - [ ] Confirm and document intended unauthenticated behavior consistency (`/api/auth/me` vs protected endpoints).
- [ ] **Tests still needed**
  - [ ] Concurrent same-email signup returns deterministic conflict behavior.
  - [ ] Invalid email vs invalid password login responses remain indistinguishable.
  - [ ] Unverified user is blocked from vendor onboarding submission.
  - [ ] Verification/reset token single-use and expiry behavior.
  - [ ] Session role drift behavior after DB-side role changes.

## Vendor onboarding

- [ ] **Validation gaps**
  - [ ] Strengthen `vendorId` route param validation beyond non-empty string checks.
  - [ ] Keep optional contact/document normalization consistent at both API and service boundaries.
- [ ] **Authorization and ownership gaps**
  - [ ] Ensure all ownership is server-derived from authenticated user context (never client identifiers).
  - [ ] Confirm policy for profile edits after approval (whether sensitive changes require re-review).
- [ ] **Status and idempotency coverage**
  - [ ] Document and test resubmission contract for retries (stable status/body across repeated submits).
  - [ ] Verify re-submission is blocked for non-`PENDING` vendors with deterministic error codes.
- [ ] **Response consistency**
  - [ ] Remove/merge duplicate onboarding endpoints (`/api/vendors/register` and `/api/vendors/onboarding`) or guarantee strict contract parity.
- [ ] **Tests still needed**
  - [ ] One-vendor-per-user under concurrent onboarding attempts (no duplicate rows).
  - [ ] Re-submission updates pending onboarding context without creating a new vendor row.
  - [ ] Customer to vendor transition cannot escalate beyond `VENDOR`.
  - [ ] Cross-user vendor access/update attempts are denied.

## Admin vendor moderation

- [ ] **Validation gaps**
  - [ ] Enforce stronger `vendorId` validation for moderation routes.
  - [ ] Ensure malformed/missing params always return consistent validation error contracts.
- [ ] **Authorization gaps**
  - [ ] Protect against stale-role session drift for admin-only moderation operations.
- [ ] **Status transition coverage**
  - [ ] Test full transition matrix:
    - [ ] `PENDING -> APPROVED`
    - [ ] `PENDING -> SUSPENDED`
    - [ ] `APPROVED -> SUSPENDED`
    - [ ] `SUSPENDED -> APPROVED`
  - [ ] Verify `approvedAt` and server-derived `approvedBy` behavior on approve transitions.
- [ ] **Idempotency coverage**
  - [ ] Repeated `approve` remains no-op and stable response.
  - [ ] Repeated `suspend` remains no-op and stable response.
- [ ] **Tests still needed**
  - [ ] `401/403` boundaries for non-admin moderation calls.
  - [ ] Not-found and invalid-state moderation responses stay deterministic.
  - [ ] `approvedBy` cannot be client-controlled.

## Privacy and sensitive field exposure

- [ ] Remove `VendorProfile.documentUrl` from all non-admin/public responses.
- [ ] Review public/vendor payloads for unnecessary exposure of vendor contact fields.
- [ ] Add regression tests proving non-admin responses never include sensitive document URLs.

## Prisma and schema alignment

- [ ] Add/confirm schema-level strategy for email verification and password reset tokens referenced by Phase 1 auth expectations.
- [ ] Align moderation audit intent with schema integrity for `approvedBy` (FK or explicit integrity strategy).
- [ ] Confirm Phase 1 boundaries remain auth + onboarding + admin moderation, and document any intentionally out-of-scope but implemented endpoints.

## Cross-cutting test gaps before Phase 1 completion

- [ ] End-to-end integration: signup/login -> verified user onboarding -> admin approve/suspend.
- [ ] Negative-path suite for validation, authorization, and ownership checks on all Phase 1 routes.
- [ ] Error contract tests for consistent status codes and payload shapes.
- [ ] Concurrency/retry tests for duplicate signup, onboarding retries, and repeated moderation actions.
