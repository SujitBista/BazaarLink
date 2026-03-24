# Phase 1 backend business rules checklist

Source of truth: `docs/`, `prisma/schema.prisma`, `prisma/seed.ts`.

## Auth service

- [ ] **Validation rules**
  - [ ] Signup requires unique `email`, valid email format, and password that meets minimum strength.
  - [ ] Passwords are always stored as `passwordHash` (never plaintext).
  - [ ] Login requires valid credentials but must not reveal whether email or password failed.
  - [ ] Vendor onboarding submission is blocked unless `User.emailVerified = true`.
  - [ ] Verification/reset tokens are single-use and expire.
- [ ] **Authorization rules**
  - [ ] Authenticated session required for profile/session endpoints.
  - [ ] Admin-only auth operations require `User.role = ADMIN`.
- [ ] **Status transition rules**
  - [ ] `emailVerified` transitions only `false -> true` via verification flow.
  - [ ] Role changes (`CUSTOMER`, `VENDOR`, `ADMIN`) are explicit and audited.
- [ ] **Ownership rules**
  - [ ] Users can only read/update their own auth/session state.
- [ ] **Edge cases to enforce**
  - [ ] Duplicate signup attempts/races on the same email return deterministic conflict.
  - [ ] Retry-safe (idempotent) verify/reset handlers.

## RBAC service

- [ ] **Validation rules**
  - [ ] Role is one of `CUSTOMER`, `VENDOR`, `ADMIN`.
  - [ ] Vendor status is one of `PENDING`, `APPROVED`, `SUSPENDED`.
- [ ] **Authorization rules**
  - [ ] Vendor actions require `User.role = VENDOR` and matching ownership.
  - [ ] Admin moderation requires `User.role = ADMIN`.
  - [ ] Selling actions require `Vendor.status = APPROVED`.
- [ ] **Status transition rules**
  - [ ] Vendor lifecycle allows: `PENDING -> APPROVED|SUSPENDED`, `APPROVED -> SUSPENDED`, `SUSPENDED -> APPROVED` (admin only).
- [ ] **Ownership rules**
  - [ ] Vendor resource queries are always scoped by server-derived `vendorId` (never trust client `vendorId`).
- [ ] **Edge cases to enforce**
  - [ ] `PENDING`/`SUSPENDED` vendors cannot create/activate sellable catalog entries.
  - [ ] 403 responses must not leak other vendors' data existence.

## Vendor onboarding service

- [ ] **Validation rules**
  - [ ] Require authenticated user with verified email before onboarding submission.
  - [ ] Require `VendorProfile.businessName`.
  - [ ] Validate `contactEmail`/`contactPhone` format when present.
  - [ ] Validate `documentUrl` format.
  - [ ] Enforce one vendor per user (`Vendor.userId` unique) and one profile per vendor (`VendorProfile.vendorId` unique).
- [ ] **Authorization rules**
  - [ ] Only the owner can create/read/update their own onboarding data.
  - [ ] `documentUrl` is treated as sensitive; non-admin views must not expose private document links.
- [ ] **Status transition rules**
  - [ ] New vendor starts at `PENDING`.
  - [ ] Profile updates do not auto-approve.
- [ ] **Ownership rules**
  - [ ] `Vendor.userId` must be the authenticated user; no cross-user onboarding creation.
- [ ] **Edge cases to enforce**
  - [ ] Re-submission should update existing onboarding context (idempotent behavior), not create duplicate vendor rows.
  - [ ] Prevent arbitrary role escalation while enabling controlled customer-to-vendor onboarding flow.

## Admin vendor moderation service

- [ ] **Validation rules**
  - [ ] `approve`/`suspend` requires valid target `vendorId`.
  - [ ] Approval sets `approvedAt` and `approvedBy` (acting admin user ID).
- [ ] **Authorization rules**
  - [ ] Only admins can list pending vendors, approve, or suspend.
- [ ] **Status transition rules**
  - [ ] `APPROVED` can be reached from `PENDING` (and optionally `SUSPENDED` on reinstatement policy).
  - [ ] `SUSPENDED` can be set from `APPROVED` (and optionally `PENDING` as rejection-like action).
  - [ ] Repeating the same action is idempotent/no-op.
- [ ] **Ownership rules**
  - [ ] `approvedBy` is server-derived from authenticated admin, never client-controlled.
- [ ] **Edge cases to enforce**
  - [ ] Suspension blocks new product creation/activation and payouts.
  - [ ] Existing/in-flight orders are not auto-cancelled by suspension unless explicit policy is added.
  - [ ] Non-existent vendor moderation attempts return clear not-found validation.

## Catalog management service

- [ ] **Validation rules**
  - [ ] Product create/update requires valid `categoryId`, `name`, `slug`.
  - [ ] Enforce product slug uniqueness per vendor (`@@unique([vendorId, slug])`).
  - [ ] Variant validates `price > 0` and `stock >= 0`.
  - [ ] SKU uniqueness is enforced per product where SKU is present (`@@unique([productId, sku])`).
  - [ ] Category slug is globally unique.
- [ ] **Authorization rules**
  - [ ] Vendor can manage only own products/variants/images.
  - [ ] Catalog writes that enable selling require vendor to be `APPROVED`.
  - [ ] Admin can manage moderation-level catalog actions per role policy.
- [ ] **Status transition rules**
  - [ ] Product lifecycle allows `DRAFT <-> ACTIVE`.
  - [ ] Transition to `ACTIVE` only when vendor is `APPROVED` and product meets completeness checks.
  - [ ] If vendor becomes `SUSPENDED`, block further creation/activation actions.
- [ ] **Ownership rules**
  - [ ] Product ownership is vendor-scoped and immutable unless an explicit admin transfer workflow exists.
  - [ ] Variant/image operations must verify parent product ownership first.
- [ ] **Edge cases to enforce**
  - [ ] Draft products are never visible in public catalog.
  - [ ] Re-check vendor status and product status at mutation boundaries (not only at initial auth).
  - [ ] Handle slug/SKU race conditions with DB constraints and conflict-aware responses.

## Phase boundary guardrail

- [ ] Keep roadmap `Phase 1` implementation centered on auth + vendor onboarding + admin moderation.
- [ ] If catalog endpoints are scaffolded early, keep selling/public activation paths guarded until the catalog phase is enabled.
