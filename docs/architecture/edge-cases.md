# Edge cases and failure scenarios (MVP)

This document describes important **edge cases and failure modes** for BazaarLink’s MVP, aligned with `docs/flows/order-flow.md`, `docs/flows/checkout-flow.md`, `docs/business/marketplace-rules.md`, `docs/business/refund-policy.md`, `docs/business/commission-rules.md`, and `docs/implementation/phase1-plan.md`.

## Assumptions

- **Payment provider** (e.g. Stripe) is the source of truth for charge success; the app persists `Payment` + `Order` and must handle **asynchrony and retries** safely.
- **Idempotency** for checkout/payment webhooks is required for production but not spelled out in high-level docs; we assume **idempotent handlers** keyed by provider event or `Payment.externalId`.
- **Commission reversal** and **payout adjustments** after refunds are required by business docs but the exact ledger model (reversal rows vs. balance adjustments) is **implementation-defined**.
- **Shipping calculation** appears in `docs/flows/checkout-flow.md`; how totals are frozen when stock changes is not fully specified—we assume **recalculation at payment time** with clear errors if invalid.

---

## 1. Vendor suspension after order

| | |
|--|--|
| **Scenario** | A vendor is `APPROVED`, receives orders, then admin sets `Vendor.status` to `SUSPENDED`. |
| **Expected system behavior** | Per `docs/business/marketplace-rules.md`: suspended vendors **cannot create new products** or **receive payouts**. Existing orders should still be handled according to policy (`docs/implementation/phase1-plan.md` mentions existing orders may still be fulfilled). |
| **Backend enforcement** | Block product create/activate and payout creation/processing for `SUSPENDED`. Optionally hide or mark listings unavailable. **Do not** auto-cancel in-flight `OrderItem` rows unless product policy says so (not defined in docs—assume fulfillment continues unless admin intervenes). |
| **User-facing result** | Customer: existing order remains visible; tracking continues. Vendor: dashboard shows suspension; cannot list new products or receive new payouts. |

---

## 2. Payment success but order creation failure

| | |
|--|--|
| **Scenario** | Provider reports **success**, but the app fails while creating/updating `Order`, `OrderItem`, or setting statuses (DB error, timeout, bug). |
| **Expected system behavior** | **No “lost money” state:** financial state must be reconcilable with provider; order data eventually consistent or customer refunded per ops policy. `docs/flows/order-flow.md` assumes order creation follows payment success—this case is the exception path. |
| **Backend enforcement** | Prefer **one transactional unit** where possible (payment confirmation + order write). If provider success is recorded first: (a) **retry** order creation idempotently using stable keys (`externalId`, cart version), (b) **alert/monitor** stuck states, (c) manual or automated **refund** if order cannot be created. Webhook handlers must be **idempotent** so duplicate events do not duplicate orders. |
| **User-facing result** | Customer sees a clear “processing your order” or error with support path; never a silent success without an order. Admin/support can see payment without order for remediation. |

---

## 3. Refund after payout

| | |
|--|--|
| **Scenario** | A refund is approved **after** commission was accrued and/or a `Payout` was already `PROCESSED` for that vendor. |
| **Expected system behavior** | `docs/business/refund-policy.md` and `docs/business/commission-rules.md` require **payout and commission records to be updated correctly** when refunds apply. |
| **Backend enforcement** | Allow `Refund` workflow to complete with financial reconciliation: e.g. **clawback** from next payout, **negative balance** on vendor ledger, or **admin adjustment** record. Prevent **double recovery** (same refunded line triggering multiple commission reversals) with idempotent refund completion. |
| **User-facing result** | Customer receives refund per policy. Vendor sees adjusted earnings or future payout deduction (messaging depends on dashboard design—MVP may be admin-heavy). |

---

## 4. Stock changing during checkout

| | |
|--|--|
| **Scenario** | Customer loads checkout with item in cart; another buyer purchases the last units, or vendor lowers `ProductVariant.stock` before payment completes. |
| **Expected system behavior** | No oversell; checkout should fail or adjust quantities with clear messaging. `docs/implementation/phase1-plan.md` calls out **concurrent cart/stock** and suggests **reservation or optimistic locking at checkout**. |
| **Backend enforcement** | On submit/pay: **re-validate** stock (and vendor approval + product `ACTIVE`) in a transaction or with row-level locking on `ProductVariant`. Decrement stock atomically when order is confirmed (timing must match chosen pattern: reserve vs. pay-then-decrement). Reject or partial-approve lines that lack stock. |
| **User-facing result** | “Item no longer available” or quantity reduced; customer updates cart or abandons. |

---

## 5. Duplicate payment attempts

| | |
|--|--|
| **Scenario** | User double-clicks pay, retries on error, or provider sends **duplicate webhooks** for the same intent. |
| **Expected system behavior** | At most **one successful charge** per intended checkout; ledger shows one `SUCCEEDED` payment for that order (or explicit partial-payment model if ever added—**not in MVP docs**). |
| **Backend enforcement** | Idempotency keys on create-payment and webhook handling; unique constraint or application check on `Payment.externalId` where applicable; ignore duplicate `SUCCEEDED` events if order already `PAID`. |
| **User-facing result** | Single confirmation; no duplicate orders for one checkout session. |

---

## 6. Unauthorized vendor actions

| | |
|--|--|
| **Scenario** | User tries to modify another vendor’s product, or a `PENDING`/`SUSPENDED` vendor tries to activate products or access vendor-only order APIs. |
| **Expected system behavior** | Deny access; only **owner vendor** (via `User` ↔ `Vendor`) for resources; only **APPROVED** vendors can perform selling actions per `docs/business/marketplace-rules.md`. |
| **Backend enforcement** | Session + role checks; resource queries **scoped by `vendorId`**; reject `ProductStatus.ACTIVE` and catalog mutations if `Vendor.status !== APPROVED`. Admin bypass for admin routes only. |
| **User-facing result** | 403 / friendly “not allowed” message; no data leak of other vendors’ drafts. |

---

## 7. Invalid status transitions

| | |
|--|--|
| **Scenario** | API or bug attempts impossible transitions (e.g. `Order` from `CANCELLED` to `SHIPPED`, or `Refund` from `REJECTED` to `COMPLETED` without a new request). |
| **Expected system behavior** | Consistent lifecycle per `docs/database/enums.md` / `docs/implementation/phase1-plan.md`; illegal transitions rejected. |
| **Backend enforcement** | Central transition rules (state machine) for `Order`, `OrderItem`, `Payment`, `Refund`, `Payout`; validate on every update path. Refunds only `COMPLETED` when payment provider confirms and line items/commissions updated. |
| **User-facing result** | Validation error; no partial inconsistent states exposed. |

---

## Additional risks (from Phase 1 plan)

These are called out in `docs/implementation/phase1-plan.md` and overlap with the above:

- **Order split:** Each `OrderItem` must carry correct `vendorId` for commission and fulfillment.
- **Double refund:** Prevent duplicate refunds for the same `OrderItem` / payment slice.
- **Document privacy:** Vendor `documentUrl` should not be exposed to non-admin users.

---

## Related documentation

- Enums and statuses: `docs/database/enums.md`
- Detailed schema: `docs/database/schema-detailed.md`
- Order and checkout flows: `docs/flows/order-flow.md`, `docs/flows/checkout-flow.md`
