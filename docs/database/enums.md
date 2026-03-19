# Database enums and statuses (MVP / Phase 1)

This document lists enum-like values used for marketplace state. It aligns with `docs/implementation/phase1-plan.md` and the intended MVP lifecycle in `docs/flows/` and `docs/business/`.

## Assumptions

- **Single role per user:** Phase 1 plan describes the user as having a single marketplace role (`CUSTOMER`, `VENDOR`, or `ADMIN`). `docs/database/schema-notes.md` mentions “one or multiple roles”; for MVP we assume **one role per `User`** unless product later adds multi-role support.
- **Order vs payment ordering:** `docs/flows/order-flow.md` states payment succeeds, then the system creates the order. Enum definitions do not change that sequencing; see `docs/architecture/edge-cases.md` if creation fails after payment.
- **Stripe (or similar)** is the intended payment provider per `docs/architecture/system-design.md`; external IDs on `Payment` are implementation details, not separate enums.

---

## UserRole

| Value | Meaning | Where used |
|-------|---------|------------|
| `CUSTOMER` | End buyer; browses, carts, checks out, tracks orders, reviews. | `User.role`; access control for customer APIs and pages (`docs/product/users-and-roles.md`). |
| `VENDOR` | Seller; registers, manages catalog and (later) orders/earnings. | `User.role`; vendor dashboard and vendor-scoped APIs when paired with an approved `Vendor` record. |
| `ADMIN` | Platform operator; approves vendors, manages categories/commissions, views orders. | `User.role`; admin APIs and dashboard (`docs/product/users-and-roles.md`). |

**Allowed values:** `CUSTOMER` \| `VENDOR` \| `ADMIN`

---

## VendorStatus

| Value | Meaning | Where used |
|-------|---------|------------|
| `PENDING` | Registered seller awaiting admin review (`docs/flows/vendor-onboarding-flow.md`). | `Vendor.status` for new registrations. |
| `APPROVED` | May list and sell per `docs/business/marketplace-rules.md`. | `Vendor.status`; gating for `Product` activation and vendor operations. |
| `SUSPENDED` | Cannot create new products or receive payouts (`docs/business/marketplace-rules.md`). | `Vendor.status`; enforcement in catalog, payouts, and optionally visibility of listings. |

**Allowed values:** `PENDING` \| `APPROVED` \| `SUSPENDED`

---

## ProductStatus

| Value | Meaning | Where used |
|-------|---------|------------|
| `DRAFT` | Not visible in public catalog; vendor can edit. | `Product.status` during creation/editing (`docs/implementation/phase1-plan.md`). |
| `ACTIVE` | Eligible for public listing when vendor is approved and other rules pass. | `Product.status` for browse/search surfaces (`docs/product/core-features.md`). |

**Allowed values:** `DRAFT` \| `ACTIVE`

---

## OrderStatus

Represents the **customer-facing order** lifecycle (`docs/flows/order-flow.md`, `docs/product/core-features.md`).

| Value | Meaning | Where used |
|-------|---------|------------|
| `PENDING` | Order created; payment may not be completed yet (see checkout/order integration). | `Order.status` at creation or before confirmed payment. |
| `PAID` | Payment succeeded for the order total (aggregate over items/payment records). | `Order.status` after successful payment. |
| `PROCESSING` | Fulfillment in progress (vendor/admin handling). | `Order.status` post-payment. |
| `SHIPPED` | Order (or all shippable portions) dispatched. | `Order.status`; order tracking. |
| `DELIVERED` | Delivery complete. | `Order.status`; may affect refund eligibility (`docs/business/refund-policy.md`). |
| `CANCELLED` | Order cancelled per policy; not completed. | `Order.status`; must be consistent with payments/refunds. |

**Allowed values:** `PENDING` \| `PAID` \| `PROCESSING` \| `SHIPPED` \| `DELIVERED` \| `CANCELLED`

---

## OrderItemStatus

Per-line fulfillment and refunds when orders are **split by vendor** (`docs/business/marketplace-rules.md`, `docs/implementation/phase1-plan.md`).

| Value | Meaning | Where used |
|-------|---------|------------|
| `PENDING` | Line created; not yet confirmed for fulfillment. | `OrderItem.status` default. |
| `CONFIRMED` | Vendor/platform acknowledged the line item. | `OrderItem.status` during processing. |
| `SHIPPED` | This line’s quantity shipped. | `OrderItem.status`; partial multi-vendor shipments. |
| `DELIVERED` | This line delivered. | `OrderItem.status`. |
| `CANCELLED` | Line cancelled (e.g. out of stock, order split adjustment). | `OrderItem.status`. |
| `REFUNDED` | Line subject to completed refund flow. | `OrderItem.status`; ties to `Refund` and commission reversal (`docs/business/commission-rules.md`). |

**Allowed values:** `PENDING` \| `CONFIRMED` \| `SHIPPED` \| `DELIVERED` \| `CANCELLED` \| `REFUNDED`

---

## PaymentStatus

| Value | Meaning | Where used |
|-------|---------|------------|
| `PENDING` | Intent/session created; customer has not completed payment. | `Payment.status` during checkout. |
| `SUCCEEDED` | Provider confirms successful charge. | `Payment.status`; prerequisite for moving `Order` toward `PAID` per `docs/flows/order-flow.md`. |
| `FAILED` | Payment attempt failed or was abandoned as failed. | `Payment.status`; order may remain `PENDING` or be cancelled. |
| `REFUNDED` | Full or partial refund recorded against this payment (aggregate or per refund records—implementation detail). | `Payment.status`; must align with `Refund` rows and policy. |

**Allowed values:** `PENDING` \| `SUCCEEDED` \| `FAILED` \| `REFUNDED`

---

## RefundStatus

Aligns with **vendor-first review and admin dispute** language in `docs/business/refund-policy.md`.

| Value | Meaning | Where used |
|-------|---------|------------|
| `REQUESTED` | Customer (or system) opened a refund request. | `Refund.status` on creation. |
| `APPROVED` | Reviewer approved; refund may be executed with payment provider. | `Refund.status` before money movement. |
| `REJECTED` | Request denied; no payout from platform for this request. | `Refund.status`; audit trail. |
| `COMPLETED` | Refund executed; financial and commission/payout adjustments applied per policy. | `Refund.status`; may drive `OrderItemStatus.REFUNDED` / `PaymentStatus.REFUNDED`. |

**Allowed values:** `REQUESTED` \| `APPROVED` \| `REJECTED` \| `COMPLETED`

---

## PayoutStatus

| Value | Meaning | Where used |
|-------|---------|------------|
| `PENDING` | Scheduled or accrued payout not yet sent. | `Payout.status`; blocked for `VendorStatus.SUSPENDED` per marketplace rules. |
| `PROCESSED` | Payout successfully sent to vendor. | `Payout.status`; accounting reconciliation. |
| `FAILED` | Payout transmission failed; may retry or require admin action. | `Payout.status`. |

**Allowed values:** `PENDING` \| `PROCESSED` \| `FAILED`

---

## Related documentation

- Entity overview: `docs/database/entities.md`
- High-level schema notes: `docs/database/schema-notes.md`
- Detailed tables and fields: `docs/database/schema-detailed.md`
- Phase 1 scope and enum list: `docs/implementation/phase1-plan.md`
