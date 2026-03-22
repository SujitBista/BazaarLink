# Open architecture decisions (resolved for MVP)

This file records **resolved** design choices for BazaarLink’s MVP. Sources: `docs/product/`, `docs/flows/`, `docs/business/`, `docs/database/`, `docs/implementation/phase1-plan.md`, and `docs/architecture/edge-cases.md`.

---

## 1. Wishlist in MVP vs post-MVP

**Decision:** Whether wishlists ship in MVP or later.

**Recommended MVP choice:** **Post-MVP** (no wishlist in MVP).

**Reason:** `docs/product/mvp-scope.md` does not list wishlists under “Must Build First.” `docs/implementation/phase1-plan.md` does not include a Wishlist entity in its MVP table list. `docs/database/schema-detailed.md` explicitly treats wishlists as post-MVP relative to Phase 1 / Prisma scope. `docs/database/entities.md` still lists Wishlist as a conceptual entity—this is legacy breadth, not MVP commitment.

**Tradeoff:** Users cannot save products for later in-app; they rely on cart or external bookmarks. Scope and schema stay smaller.

**Final rule to adopt:** **Do not implement wishlist APIs, tables, or UI in MVP.** Add wishlist only when it is explicitly pulled into scope and schema.

**Enforcement Location**

- **API layer:** Not applicable in MVP (no wishlist endpoints). When wishlist is in scope later: validate ownership and product availability in service/route handlers.
- **Database:** Not applicable in MVP. Post-MVP: tables, foreign keys, and indexes (e.g. user + product uniqueness) as defined in updated schema docs.
- **Background jobs / async workers:** Not applicable for MVP wishlist (none).
- **Admin/manual process:** Not required for enforcing “no wishlist in MVP”; product/scope reviews decide when to add it.

**Related Enums**

- None for MVP (wishlist is out of scope; no wishlist-specific enums in `docs/database/enums.md` today).

**Example Scenario**

1. **MVP:** A customer finds a product they like but is not ready to buy. They add it to the cart (if cart exists) or bookmark the URL; there is no “Save for later” in the app, consistent with reduced scope.
2. **Post-MVP (illustrative only):** Same user later uses “Add to wishlist”; enforcement would live on new APIs and tables—not part of current MVP rules above.

---

## 2. Single-role vs multi-role users

**Decision:** Whether one user account can act as customer and vendor (and/or admin) simultaneously.

**Recommended MVP choice:** **Single role per `User`** (`CUSTOMER`, `VENDOR`, or `ADMIN`), with **at most one `Vendor` record** when role is `VENDOR`.

**Reason:** `docs/implementation/phase1-plan.md` defines the user as having a single role and optional vendor linkage. `docs/database/enums.md` assumes one role per user for MVP. `docs/product/users-and-roles.md` describes three distinct personas without requiring one person to combine them in one account.

**Tradeoff:** A real person who is both buyer and seller needs two accounts (or a later migration to multi-role). RBAC and data scoping stay simple.

**Final rule to adopt:** **Enforce exactly one `User.role` and at most one `Vendor` per user.** Multi-role or multi-vendor-per-user is out of scope until product docs change.

**Enforcement Location**

- **API layer (service validation):** Signup, role changes (if any), and vendor registration must reject combinations that imply multiple roles per account or multiple vendor profiles for one user; session/`me` responses must not merge personas.
- **Database:** Prefer enum/check constraint on `User.role`; unique constraint on `Vendor.userId` (or equivalent) so at most one vendor row per user.
- **Background jobs / async workers:** Not primary enforcement; workers should assume single role when resolving actors (e.g. payout recipient = the one vendor linked to that user).
- **Admin/manual process:** Admin tooling should not create duplicate vendor rows or assign a second role without an explicit future product change.

**Related Enums**

- `UserRole` (`CUSTOMER`, `VENDOR`, `ADMIN`)

**Example Scenario**

1. **Buyer only:** Alice signs up as `CUSTOMER`. She can browse and check out; she cannot access vendor dashboard APIs without a separate account or a documented product change.
2. **Seller path:** Bob registers with `User.role = VENDOR` and completes onboarding; the system creates exactly one `Vendor` linked to Bob’s `userId`. A second “apply as vendor” for the same user is rejected at the API and blocked by DB uniqueness.

---

## 3. Refund after payout policy

**Decision:** How to reconcile customer refunds when commission was already accrued and/or a vendor payout was already **processed**.

**Recommended MVP choice:** **Allow the refund to complete to the customer**; **recover vendor-side obligations via the vendor ledger**—primarily **deduction from the next payout** (and **admin adjustment** when the balance is insufficient or payouts are paused).

**Reason:** `docs/business/refund-policy.md` and `docs/business/commission-rules.md` require payout and commission records to stay correct when refunds apply. `docs/architecture/edge-cases.md` (refund after payout) already points to clawback, negative balance, or admin adjustment with idempotent refund completion.

**Tradeoff:** Vendors may see reduced or negative net payouts; ops may need admin tools for edge cases. Simpler than blocking refunds after payout, which would violate customer-facing policy.

**Final rule to adopt:** **Never block a legitimate, policy-approved refund solely because payout already ran.** **Reverse commission idempotently** for the refunded lines. **Record vendor recovery** (e.g. negative adjustment or next-payout deduction) so totals reconcile; use **admin override** when automated recovery is incomplete (e.g. suspended vendor, no upcoming payout).

**Enforcement Location**

- **API layer (service validation):** Refund approval and execution services enforce idempotent commission reversal and ledger entries; refuse to “double-reverse” the same logical refund.
- **Database:** Ledger/payout/refund tables with constraints and idempotency keys as designed in schema; aggregates must remain consistent with `RefundStatus`, `PaymentStatus`, and line-level refund state.
- **Background jobs / async workers:** Payout generation applies outstanding negative vendor balance (post-refund clawback); optional reconciliation jobs flag mismatches.
- **Admin/manual process:** When automated recovery cannot complete (e.g. suspended vendor, no future payout), admin records an adjustment or follows dispute/refund ops runbooks.

**Related Enums**

- `RefundStatus`
- `PaymentStatus`
- `PayoutStatus`
- `OrderItemStatus` (e.g. transition to `REFUNDED` when refund completes for a line)

**Example Scenario**

1. **Refund after payout:** A line item was included in a `Payout` with `PayoutStatus.PROCESSED`. The customer’s refund is approved; the provider returns funds. The system sets `RefundStatus` through `COMPLETED`, reverses commission once (idempotent), and posts a vendor ledger debit. The next payout run reduces the vendor’s net amount by that debit.
2. **Insufficient future payout / suspended vendor:** The same refund completes for the customer, but the vendor is `SUSPENDED` and has no scheduled payout. Automated next-payout deduction cannot fully recover; ops uses **admin adjustment** (or equivalent) so platform books still reconcile while the final rule above remains: the refund was not blocked solely because payout already ran.

---

## 4. Suspended vendor behavior for active listings and in-flight orders

**Decision:** What happens to **existing ACTIVE products** and **orders already placed** when `Vendor.status` becomes `SUSPENDED`.

**Recommended MVP choice:** **Hide or mark listings unavailable in the public catalog** (no new sales). **Do not auto-cancel in-flight `Order` / `OrderItem` rows by default.** **Block new products, product activation, and payouts** as already stated in `docs/business/marketplace-rules.md`. Fulfillment continues unless **admin** explicitly intervenes (cancel/refund per policy).

**Reason:** Marketplace rules already forbid new products and payouts when suspended. `docs/implementation/phase1-plan.md` and `docs/architecture/edge-cases.md` align: optionally hide listings; existing orders fulfilled per policy; no automatic mass-cancel unless product policy demands it (it does not today).

**Tradeoff:** A suspended vendor may still need to ship open orders; if they do not, ops uses admin/dispute paths. Customers are not surprised by silent mass cancellation.

**Final rule to adopt:** On **SUSPENDED**: **public surfaces must not allow checkout of that vendor’s products** (hide or show as unavailable). **Backend blocks** catalog mutations that create/activate listings and **blocks payout processing**. **In-flight orders remain in their workflow** until completed, cancelled, or refunded through normal or admin-driven processes.

**Enforcement Location**

- **API layer (service validation):** Public product listing and checkout paths exclude or reject suspended vendors’ `ProductStatus.ACTIVE` goods; vendor APIs reject new product creation and activation while `VendorStatus.SUSPENDED`.
- **Database:** `Vendor.status` drives application rules; optional partial indexes or filtered queries for “active catalog” can exclude suspended vendors (implementation detail).
- **Background jobs / async workers:** Payout jobs skip or hold vendors in `SUSPENDED`; no new accrual payouts until rules and status change.
- **Admin/manual process:** Admin may cancel orders or initiate refunds per policy; no default mass auto-cancel on suspension.

**Related Enums**

- `VendorStatus`
- `ProductStatus`
- `OrderStatus`
- `OrderItemStatus`

**Example Scenario**

1. **Suspension with in-flight order:** Vendor X is `APPROVED` with `ACTIVE` listings. A customer places an order; `Order` / `OrderItem` rows enter the normal workflow. Admin sets `VendorStatus.SUSPENDED`. Catalog APIs stop offering X’s products for new checkout; vendor cannot create new products or receive payouts. The existing order stays `PAID` / `PROCESSING` (etc.) until fulfilled, cancelled, or refunded through normal or admin-driven steps—not auto-cancelled.
2. **New sale attempt after suspension:** Another customer still has an old product link. Checkout or cart validation rejects the purchase because suspended-vendor inventory is not sellable on public surfaces, matching “no new sales” while prior orders continue as above.

---

## 5. Email verification requirements

**Decision:** Whether and when verified email is **required** vs optional.

**Recommended MVP choice:** **Persist `emailVerified` (and support verification + password reset as in `docs/product/core-features.md`). Require verified email before checkout and before “register as seller” submission** (vendor onboarding). **Allow signup and login without verification** so accounts exist and sessions work.

**Reason:** Core features include email verification; schema already anticipates `emailVerified` (`docs/database/schema-detailed.md`). `docs/implementation/phase1-plan.md` suggests gating sensitive actions (e.g. checkout) if verification is in MVP. Vendor onboarding involves trust and documents—verification before seller registration fits `docs/flows/vendor-onboarding-flow.md` without blocking anonymous browsing.

**Tradeoff:** Slight friction before first purchase or seller application; reduces junk checkouts and uncontactable sellers.

**Final rule to adopt:** **Unverified users may browse (and use cart if implemented) but cannot complete checkout or submit vendor registration until `emailVerified` is true.** Password reset flows remain as specified in product docs.

**Enforcement Location**

- **API layer (service validation):** Checkout completion and vendor registration submission handlers require `emailVerified === true`; signup/login and browse remain allowed when false.
- **Database:** Persist `emailVerified` (boolean/timestamp per schema); no separate enum for verification state.
- **Background jobs / async workers:** Email senders for verification links; optional jobs to mark tokens expired (implementation detail)—not the primary gate for checkout.
- **Admin/manual process:** Support may manually verify or resend links per ops policy (outside core rule text above).

**Related Enums**

- `UserRole` (context for vendor onboarding; checkout gating applies to any role attempting checkout)
- Email verification itself is **`User.emailVerified`** (boolean/timestamp per schema), not an enum in `docs/database/enums.md`.

**Example Scenario**

1. **Browse vs checkout:** Sam signs up, logs in, and browses with `emailVerified` false. Adding to cart works if cart exists. On “Place order” / payment finalization, the API returns an error directing Sam to verify email first; after clicking the link, checkout proceeds.
2. **Seller application:** Priya is `CUSTOMER` with unverified email. She opens “Become a seller”; the UI can collect draft info, but **submit** is rejected until `emailVerified` is true, aligning with trust/onboarding expectations.

---

## 6. Shipping data stored on Order

**Decision:** What shipping-related information the `Order` record must carry (address identity vs snapshot, fees, method, tracking).

**Recommended MVP choice:** **Store `shippingAddressId` referencing the customer’s `Address` chosen at checkout** (as in `docs/database/schema-detailed.md`). **Persist amounts the customer was charged on the order**—`totalAmount` must reflect the paid total; **add explicit stored fields for shipping when checkout ships** (e.g. `shippingAmount` and a simple `shippingMethod` label or code) so disputes and refunds do not depend on recomputing quotes later. **Tracking numbers** can live on `Order` and/or `OrderItem` when fulfillment is built; MVP minimum is **whatever carriers need per line or per order**, starting with **per vendor slice (`OrderItem`)** if multi-vendor shipments differ.

**Reason:** Checkout flow includes address selection and shipping calculation (`docs/flows/checkout-flow.md`). Orders must reflect **what was paid** and **where to ship** without ambiguity. Referencing `Address` matches the documented schema; **freezing charged shipping components** matches commission/refund correctness. Edge-case doc notes recalculation at payment time—**persisted totals** are the audit trail after success.

**Tradeoff:** If only `Address` is linked and the user **edits** that address later, historical display could drift unless the app **blocks edits to addresses referenced by orders** or adds a snapshot later. MVP avoids snapshot columns by **treating addresses used on orders as immutable** (or by copying snapshot in a later phase if legal/compliance requires).

**Final rule to adopt:** **`Order` stores `shippingAddressId` plus any separate line items needed to reconstruct **subtotal, shipping, and total actually charged** at payment time.** **Do not allow changes to an `Address` row that would alter the meaning of a completed order** (immutable link or snapshot policy—**immutable linked address for MVP**). **Tracking** is stored on the fulfillment record (`Order`/`OrderItem`) when shipment exists, not inferred from checkout quotes.

**Enforcement Location**

- **API layer (service validation):** Checkout/order creation persists `shippingAddressId`, charged subtotal/shipping/total (and line amounts) atomically with payment success; updates to addresses referenced by completed orders are rejected or copied before link (per immutable policy).
- **Database:** Foreign key from `Order` to `Address`; non-null or validated shipping/total fields as per schema; prevents orders with totals that contradict stored payment aggregates when both exist.
- **Background jobs / async workers:** Not primary for storing shipping at creation; carrier sync or tracking updates may write `Order`/`OrderItem` tracking fields when fulfillment exists.
- **Admin/manual process:** Admin corrections to bad addresses for a placed order follow ops policy (exception path); default rule remains immutable linked address for MVP.

**Related Enums**

- `OrderStatus`
- `OrderItemStatus`
- `PaymentStatus` (order totals must align with what was actually charged and recorded on `Payment` when payment exists)

**Example Scenario**

1. **Happy path:** At checkout, the customer selects address A and standard shipping. Payment succeeds. The `Order` row stores `shippingAddressId` → A, `shippingAmount`, `shippingMethod`, and `totalAmount` matching the payment. A later refund uses these stored amounts, not a recomputed live shipping quote.
2. **Order vs payment consistency (edge):** If a timeout or retry caused anxiety about double charge, reconciliation still uses persisted order totals and `Payment` records together: support compares `Order` charged breakdown to `PaymentStatus.SUCCEEDED` amount; immutable address A prevents “ship to edited home B” confusion after the order was placed.

---

## Related documentation

- Scope and schema: `docs/implementation/phase1-plan.md`, `docs/database/schema-detailed.md`, `docs/database/enums.md`
- Rules and flows: `docs/business/marketplace-rules.md`, `docs/business/commission-rules.md`, `docs/business/refund-policy.md`, `docs/flows/checkout-flow.md`, `docs/flows/order-flow.md`
- Edge cases: `docs/architecture/edge-cases.md`
