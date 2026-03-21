# Open architecture decisions (resolved for MVP)

This file records **resolved** design choices for BazaarLink’s MVP. Sources: `docs/product/`, `docs/flows/`, `docs/business/`, `docs/database/`, `docs/implementation/phase1-plan.md`, and `docs/architecture/edge-cases.md`.

---

## 1. Wishlist in MVP vs post-MVP

**Decision:** Whether wishlists ship in MVP or later.

**Recommended MVP choice:** **Post-MVP** (no wishlist in MVP).

**Reason:** `docs/product/mvp-scope.md` does not list wishlists under “Must Build First.” `docs/implementation/phase1-plan.md` does not include a Wishlist entity in its MVP table list. `docs/database/schema-detailed.md` explicitly treats wishlists as post-MVP relative to Phase 1 / Prisma scope. `docs/database/entities.md` still lists Wishlist as a conceptual entity—this is legacy breadth, not MVP commitment.

**Tradeoff:** Users cannot save products for later in-app; they rely on cart or external bookmarks. Scope and schema stay smaller.

**Final rule to adopt:** **Do not implement wishlist APIs, tables, or UI in MVP.** Add wishlist only when it is explicitly pulled into scope and schema.

---

## 2. Single-role vs multi-role users

**Decision:** Whether one user account can act as customer and vendor (and/or admin) simultaneously.

**Recommended MVP choice:** **Single role per `User`** (`CUSTOMER`, `VENDOR`, or `ADMIN`), with **at most one `Vendor` record** when role is `VENDOR`.

**Reason:** `docs/implementation/phase1-plan.md` defines the user as having a single role and optional vendor linkage. `docs/database/enums.md` assumes one role per user for MVP. `docs/product/users-and-roles.md` describes three distinct personas without requiring one person to combine them in one account.

**Tradeoff:** A real person who is both buyer and seller needs two accounts (or a later migration to multi-role). RBAC and data scoping stay simple.

**Final rule to adopt:** **Enforce exactly one `User.role` and at most one `Vendor` per user.** Multi-role or multi-vendor-per-user is out of scope until product docs change.

---

## 3. Refund after payout policy

**Decision:** How to reconcile customer refunds when commission was already accrued and/or a vendor payout was already **processed**.

**Recommended MVP choice:** **Allow the refund to complete to the customer**; **recover vendor-side obligations via the vendor ledger**—primarily **deduction from the next payout** (and **admin adjustment** when the balance is insufficient or payouts are paused).

**Reason:** `docs/business/refund-policy.md` and `docs/business/commission-rules.md` require payout and commission records to stay correct when refunds apply. `docs/architecture/edge-cases.md` (refund after payout) already points to clawback, negative balance, or admin adjustment with idempotent refund completion.

**Tradeoff:** Vendors may see reduced or negative net payouts; ops may need admin tools for edge cases. Simpler than blocking refunds after payout, which would violate customer-facing policy.

**Final rule to adopt:** **Never block a legitimate, policy-approved refund solely because payout already ran.** **Reverse commission idempotently** for the refunded lines. **Record vendor recovery** (e.g. negative adjustment or next-payout deduction) so totals reconcile; use **admin override** when automated recovery is incomplete (e.g. suspended vendor, no upcoming payout).

---

## 4. Suspended vendor behavior for active listings and in-flight orders

**Decision:** What happens to **existing ACTIVE products** and **orders already placed** when `Vendor.status` becomes `SUSPENDED`.

**Recommended MVP choice:** **Hide or mark listings unavailable in the public catalog** (no new sales). **Do not auto-cancel in-flight `Order` / `OrderItem` rows by default.** **Block new products, product activation, and payouts** as already stated in `docs/business/marketplace-rules.md`. Fulfillment continues unless **admin** explicitly intervenes (cancel/refund per policy).

**Reason:** Marketplace rules already forbid new products and payouts when suspended. `docs/implementation/phase1-plan.md` and `docs/architecture/edge-cases.md` align: optionally hide listings; existing orders fulfilled per policy; no automatic mass-cancel unless product policy demands it (it does not today).

**Tradeoff:** A suspended vendor may still need to ship open orders; if they do not, ops uses admin/dispute paths. Customers are not surprised by silent mass cancellation.

**Final rule to adopt:** On **SUSPENDED**: **public surfaces must not allow checkout of that vendor’s products** (hide or show as unavailable). **Backend blocks** catalog mutations that create/activate listings and **blocks payout processing**. **In-flight orders remain in their workflow** until completed, cancelled, or refunded through normal or admin-driven processes.

---

## 5. Email verification requirements

**Decision:** Whether and when verified email is **required** vs optional.

**Recommended MVP choice:** **Persist `emailVerified` (and support verification + password reset as in `docs/product/core-features.md`). Require verified email before checkout and before “register as seller” submission** (vendor onboarding). **Allow signup and login without verification** so accounts exist and sessions work.

**Reason:** Core features include email verification; schema already anticipates `emailVerified` (`docs/database/schema-detailed.md`). `docs/implementation/phase1-plan.md` suggests gating sensitive actions (e.g. checkout) if verification is in MVP. Vendor onboarding involves trust and documents—verification before seller registration fits `docs/flows/vendor-onboarding-flow.md` without blocking anonymous browsing.

**Tradeoff:** Slight friction before first purchase or seller application; reduces junk checkouts and uncontactable sellers.

**Final rule to adopt:** **Unverified users may browse (and use cart if implemented) but cannot complete checkout or submit vendor registration until `emailVerified` is true.** Password reset flows remain as specified in product docs.

---

## 6. Shipping data stored on Order

**Decision:** What shipping-related information the `Order` record must carry (address identity vs snapshot, fees, method, tracking).

**Recommended MVP choice:** **Store `shippingAddressId` referencing the customer’s `Address` chosen at checkout** (as in `docs/database/schema-detailed.md`). **Persist amounts the customer was charged on the order**—`totalAmount` must reflect the paid total; **add explicit stored fields for shipping when checkout ships** (e.g. `shippingAmount` and a simple `shippingMethod` label or code) so disputes and refunds do not depend on recomputing quotes later. **Tracking numbers** can live on `Order` and/or `OrderItem` when fulfillment is built; MVP minimum is **whatever carriers need per line or per order**, starting with **per vendor slice (`OrderItem`)** if multi-vendor shipments differ.

**Reason:** Checkout flow includes address selection and shipping calculation (`docs/flows/checkout-flow.md`). Orders must reflect **what was paid** and **where to ship** without ambiguity. Referencing `Address` matches the documented schema; **freezing charged shipping components** matches commission/refund correctness. Edge-case doc notes recalculation at payment time—**persisted totals** are the audit trail after success.

**Tradeoff:** If only `Address` is linked and the user **edits** that address later, historical display could drift unless the app **blocks edits to addresses referenced by orders** or adds a snapshot later. MVP avoids snapshot columns by **treating addresses used on orders as immutable** (or by copying snapshot in a later phase if legal/compliance requires).

**Final rule to adopt:** **`Order` stores `shippingAddressId` plus any separate line items needed to reconstruct **subtotal, shipping, and total actually charged** at payment time.** **Do not allow changes to an `Address` row that would alter the meaning of a completed order** (immutable link or snapshot policy—**immutable linked address for MVP**). **Tracking** is stored on the fulfillment record (`Order`/`OrderItem`) when shipment exists, not inferred from checkout quotes.

---

## Related documentation

- Scope and schema: `docs/implementation/phase1-plan.md`, `docs/database/schema-detailed.md`, `docs/database/enums.md`
- Rules and flows: `docs/business/marketplace-rules.md`, `docs/business/commission-rules.md`, `docs/business/refund-policy.md`, `docs/flows/checkout-flow.md`, `docs/flows/order-flow.md`
- Edge cases: `docs/architecture/edge-cases.md`
