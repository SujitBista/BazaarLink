# Detailed MVP database schema

This document describes the **MVP marketplace schema** consistent with `docs/implementation/phase1-plan.md`, `docs/database/entities.md`, and `docs/database/schema-notes.md`. Field-level detail matches the project’s Prisma schema where implemented; gaps between older doc bullets and the schema are called out under **Assumptions**.

## Assumptions

- **Wishlist:** `docs/database/entities.md` lists **Wishlist**; it is **not** in the Phase 1 plan table list or the current Prisma MVP schema. Treat wishlists as **post-MVP** unless added explicitly.
- **User roles:** One `User` has one `role` (see `docs/database/enums.md` assumptions).
- **Money fields:** Prices, totals, commission, payout, and refund amounts use decimal types (e.g. `Decimal(10,2)` for currency amounts, `Decimal(5,2)` for commission percentage).
- **Timestamps:** `createdAt` / `updatedAt` are standard audit fields on mutable entities.
- **IDs:** String primary keys (e.g. cuid) are assumed for MVP unless the team standardizes on UUIDs.

---

## User

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|--------|
| `id` | string (PK) | yes | generated | |
| `email` | string | yes | — | **unique** |
| `passwordHash` | string | yes | — | Mapped from `password_hash` in DB |
| `role` | `UserRole` | yes | `CUSTOMER` | |
| `emailVerified` | boolean | optional | `false` | Supports email verification (`docs/product/core-features.md`) |
| `createdAt` | datetime | yes | now | |
| `updatedAt` | datetime | yes | auto | |

**Relationships**

- `vendor` — optional 1:1 `Vendor`
- `addresses` — 1:N `Address`
- `cart` — optional 1:1 `Cart`
- `orders` — 1:N `Order`
- `reviews` — 1:N `Review`

**Constraints / indexes**

- Unique: `email`

---

## Vendor

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|--------|
| `id` | string (PK) | yes | generated | |
| `userId` | string (FK → User) | yes | — | **unique** (at most one vendor per user) |
| `status` | `VendorStatus` | yes | `PENDING` | |
| `approvedAt` | datetime | optional | — | Set when approved |
| `approvedBy` | string | optional | — | Admin user id (implementation convention) |
| `createdAt` | datetime | yes | now | |
| `updatedAt` | datetime | yes | auto | |

**Relationships**

- `user` — N:1 `User`
- `profile` — optional 1:1 `VendorProfile`
- `products` — 1:N `Product`
- `orderItems` — 1:N `OrderItem`
- `commissions` — 1:N `Commission`
- `payouts` — 1:N `Payout`

**Constraints / indexes**

- Unique: `userId`
- On delete: cascade from `User` (vendor removed if user removed—confirm policy for production)

---

## VendorProfile

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|--------|
| `id` | string (PK) | yes | generated | |
| `vendorId` | string (FK → Vendor) | yes | — | **unique** |
| `businessName` | string | yes | — | |
| `documentUrl` | string | optional | — | Vendor document (`docs/flows/vendor-onboarding-flow.md`); should be private storage per phase1-plan |
| `contactEmail` | string | optional | — | |
| `contactPhone` | string | optional | — | |
| `createdAt` | datetime | yes | now | |
| `updatedAt` | datetime | yes | auto | |

**Relationships**

- `vendor` — 1:1 `Vendor`

**Constraints / indexes**

- Unique: `vendorId`

---

## Address

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|--------|
| `id` | string (PK) | yes | generated | |
| `userId` | string (FK → User) | yes | — | |
| `label` | string | optional | — | e.g. “Home” |
| `line1` | string | yes | — | |
| `line2` | string | optional | — | |
| `city` | string | yes | — | |
| `state` | string | optional | — | |
| `postalCode` | string | yes | — | |
| `country` | string | yes | — | |
| `createdAt` | datetime | yes | now | |
| `updatedAt` | datetime | yes | auto | |

**Relationships**

- `user` — N:1 `User`
- `orders` — 1:N `Order` (as shipping address)

**Constraints / indexes**

- Index: typical pattern is `userId` for listing addresses (add if not present in migration)

---

## Category

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|--------|
| `id` | string (PK) | yes | generated | |
| `name` | string | yes | — | |
| `slug` | string | yes | — | **unique**; URL segment |
| `parentId` | string (FK → Category) | optional | — | Tree (`docs/implementation/phase1-plan.md`) |
| `createdAt` | datetime | yes | now | |
| `updatedAt` | datetime | yes | auto | |

**Relationships**

- `parent` / `children` — self-referential tree
- `products` — 1:N `Product`

**Constraints / indexes**

- Unique: `slug`

---

## Product

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|--------|
| `id` | string (PK) | yes | generated | |
| `vendorId` | string (FK → Vendor) | yes | — | |
| `categoryId` | string (FK → Category) | yes | — | |
| `name` | string | yes | — | |
| `slug` | string | yes | — | **unique per vendor** (`vendorId` + `slug`) |
| `description` | string | optional | — | |
| `status` | `ProductStatus` | yes | `DRAFT` | |
| `createdAt` | datetime | yes | now | |
| `updatedAt` | datetime | yes | auto | |

**Relationships**

- `vendor` — N:1 `Vendor`
- `category` — N:1 `Category`
- `images` — 1:N `ProductImage`
- `variants` — 1:N `ProductVariant`
- `reviews` — 1:N `Review`

**Constraints / indexes**

- Unique: `(vendorId, slug)`
- Indexes: `vendorId`, `categoryId`, `status`

---

## ProductImage

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|--------|
| `id` | string (PK) | yes | generated | |
| `productId` | string (FK → Product) | yes | — | |
| `url` | string | yes | — | Object storage URL |
| `sortOrder` | int | yes | `0` | Display order |
| `createdAt` | datetime | yes | now | |

**Relationships**

- `product` — N:1 `Product`

**Constraints / indexes**

- Index: `productId` (via relation)

---

## ProductVariant

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|--------|
| `id` | string (PK) | yes | generated | |
| `productId` | string (FK → Product) | yes | — | |
| `sku` | string | optional | — | **unique per product** when combined with `productId` |
| `price` | decimal | yes | — | |
| `stock` | int | yes | `0` | Inventory |
| `attributes` | JSON | optional | — | e.g. size/color |
| `createdAt` | datetime | yes | now | |
| `updatedAt` | datetime | yes | auto | |

**Relationships**

- `product` — N:1 `Product`
- `cartItems` — 1:N `CartItem`
- `orderItems` — 1:N `OrderItem`

**Constraints / indexes**

- Unique: `(productId, sku)` (nullable SKU behavior—confirm app-level validation)
- Index: `productId`

---

## Cart

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|--------|
| `id` | string (PK) | yes | generated | |
| `userId` | string (FK → User) | yes | — | **unique** (one cart per user in MVP) |
| `createdAt` | datetime | yes | now | |
| `updatedAt` | datetime | yes | auto | |

**Relationships**

- `user` — 1:1 `User`
- `items` — 1:N `CartItem`

**Constraints / indexes**

- Unique: `userId`

---

## CartItem

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|--------|
| `id` | string (PK) | yes | generated | |
| `cartId` | string (FK → Cart) | yes | — | |
| `productVariantId` | string (FK → ProductVariant) | yes | — | |
| `quantity` | int | yes | `1` | |
| `createdAt` | datetime | yes | now | |
| `updatedAt` | datetime | yes | auto | |

**Relationships**

- `cart` — N:1 `Cart`
- `productVariant` — N:1 `ProductVariant`

**Constraints / indexes**

- Unique: `(cartId, productVariantId)`
- Index: `cartId`

---

## Order

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|--------|
| `id` | string (PK) | yes | generated | |
| `userId` | string (FK → User) | yes | — | Customer |
| `status` | `OrderStatus` | yes | `PENDING` | |
| `totalAmount` | decimal | yes | — | Order total |
| `shippingAddressId` | string (FK → Address) | yes | — | Snapshot of chosen address at checkout (address row referenced) |
| `createdAt` | datetime | yes | now | |
| `updatedAt` | datetime | yes | auto | |

**Relationships**

- `user` — N:1 `User`
- `shippingAddress` — N:1 `Address`
- `items` — 1:N `OrderItem`
- `payments` — 1:N `Payment`
- `commissions` — 1:N `Commission`

**Constraints / indexes**

- Indexes: `userId`, `status`

---

## OrderItem

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|--------|
| `id` | string (PK) | yes | generated | |
| `orderId` | string (FK → Order) | yes | — | |
| `productVariantId` | string (FK → ProductVariant) | yes | — | |
| `vendorId` | string (FK → Vendor) | yes | — | **Per-vendor split** (`docs/business/marketplace-rules.md`) |
| `quantity` | int | yes | — | |
| `price` | decimal | yes | — | Unit price at time of order (snapshot) |
| `status` | `OrderItemStatus` | yes | `PENDING` | |
| `createdAt` | datetime | yes | now | |
| `updatedAt` | datetime | yes | auto | |

**Relationships**

- `order` — N:1 `Order`
- `productVariant` — N:1 `ProductVariant`
- `vendor` — N:1 `Vendor`
- `refunds` — 1:N `Refund`

**Constraints / indexes**

- Indexes: `orderId`, `vendorId`

---

## Payment

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|--------|
| `id` | string (PK) | yes | generated | |
| `orderId` | string (FK → Order) | yes | — | |
| `amount` | decimal | yes | — | |
| `status` | `PaymentStatus` | yes | `PENDING` | |
| `externalId` | string | optional | — | e.g. Stripe PaymentIntent id |
| `createdAt` | datetime | yes | now | |
| `updatedAt` | datetime | yes | auto | |

**Relationships**

- `order` — N:1 `Order`
- `refunds` — 1:N `Refund`

**Constraints / indexes**

- Index: `orderId`

---

## Refund

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|--------|
| `id` | string (PK) | yes | generated | |
| `orderItemId` | string (FK → OrderItem) | optional | — | Line-level refund |
| `paymentId` | string (FK → Payment) | optional | — | Link to payment record |
| `amount` | decimal | yes | — | |
| `status` | `RefundStatus` | yes | `REQUESTED` | |
| `requestedBy` | string | yes | — | User id (customer or actor) |
| `reviewedBy` | string | optional | — | Vendor/admin reviewer |
| `createdAt` | datetime | yes | now | |
| `updatedAt` | datetime | yes | auto | |

**Relationships**

- `orderItem` — optional N:1 `OrderItem`
- `payment` — optional N:1 `Payment`

**Constraints / indexes**

- Indexes: `orderItemId`, `paymentId`
- **Validation:** At least one of `orderItemId` / `paymentId` should be enforced at application layer for MVP consistency

---

## Commission

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|--------|
| `id` | string (PK) | yes | generated | |
| `orderId` | string (FK → Order) | yes | — | |
| `vendorId` | string (FK → Vendor) | yes | — | |
| `amount` | decimal | yes | — | Commission amount |
| `percentage` | decimal | yes | — | Rate applied (e.g. 5.00 = 5%) |
| `createdAt` | datetime | yes | now | |

**Relationships**

- `order` — N:1 `Order`
- `vendor` — N:1 `Vendor`

**Constraints / indexes**

- Indexes: `orderId`, `vendorId`

**Note:** `docs/business/commission-rules.md` requires reversing commission on refund when applicable; implementation may use reversal rows, negative adjustments, or linked commission line reversals—**not fully specified in docs**.

---

## Payout

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|--------|
| `id` | string (PK) | yes | generated | |
| `vendorId` | string (FK → Vendor) | yes | — | |
| `amount` | decimal | yes | — | |
| `status` | `PayoutStatus` | yes | `PENDING` | |
| `periodFrom` | datetime | optional | — | Accrual window start |
| `periodTo` | datetime | optional | — | Accrual window end |
| `createdAt` | datetime | yes | now | |
| `updatedAt` | datetime | yes | auto | |

**Relationships**

- `vendor` — N:1 `Vendor`

**Constraints / indexes**

- Index: `vendorId`

---

## Review

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|--------|
| `id` | string (PK) | yes | generated | |
| `productId` | string (FK → Product) | yes | — | |
| `userId` | string (FK → User) | yes | — | |
| `rating` | int | yes | — | 1–5 (`docs/product/core-features.md`) |
| `comment` | string | optional | — | |
| `createdAt` | datetime | yes | now | |
| `updatedAt` | datetime | yes | auto | |

**Relationships**

- `product` — N:1 `Product`
- `user` — N:1 `User`

**Constraints / indexes**

- Unique: `(productId, userId)` — one review per user per product (MVP assumption)
- Index: `productId`

---

## Entity relationship summary (MVP)

```
User 1 ──0..1 Vendor ──1 VendorProfile
User 1 ──* Address
User 1 ──0..1 Cart ──* CartItem ── ProductVariant ── Product ── Vendor
User 1 ──* Order ──* OrderItem ── Vendor
Order ──* Payment ──* Refund
Order ──* Commission ── Vendor
Vendor ──* Payout
Product ──* Review ── User
Category (tree) ──* Product
```

---

## Related documentation

- Enum definitions: `docs/database/enums.md`
- Phase 1 entity list: `docs/implementation/phase1-plan.md`
- Edge cases: `docs/architecture/edge-cases.md`
