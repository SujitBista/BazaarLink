# BazaarLink

Multi-vendor ecommerce marketplace. Phase 1: authentication, roles, vendor onboarding, and product catalog MVP.

## Docs

- **Plan:** [docs/implementation/phase1-plan.md](docs/implementation/phase1-plan.md) – architecture summary, MVP schema, folder structure, enums, edge cases, Phase 1 scope.
- Product, architecture, database, business rules, and flows: see `docs/`.

## Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend:** Next.js API routes, service layer (plain functions)
- **Database:** PostgreSQL, Prisma ORM

## Setup

1. **Env**

   ```bash
   cp .env.example .env
   ```

   Set `DATABASE_URL` (PostgreSQL) and `SESSION_SECRET` (min 32 chars).

2. **Dependencies**

   ```bash
   npm install
   ```

3. **Database**

   ```bash
   npm run db:migrate    # or: npx prisma migrate deploy (production)
   npm run db:seed       # optional: create admin + default categories
   ```

4. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). API list is on the home page.

## Roles & flows

- **Customer:** signup → browse products, cart, checkout (later).
- **Vendor:** authenticated + verified user submits onboarding via POST `/api/vendors/register` (or `/api/vendors/onboarding`) with business profile + document URL → admin approves → create products (DRAFT/ACTIVE). Only APPROVED vendors can list ACTIVE products.
- **Admin:** approve/suspend vendors, manage categories, manage products (later).

## API overview

| Area        | Endpoints |
|------------|-----------|
| Auth       | `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` |
| Vendors    | `POST /api/vendors/register` (or `POST /api/vendors/onboarding`), `GET /api/vendors/me`, `GET/PATCH /api/vendors/[id]` |
| Admin      | `GET /api/admin/vendors`, `POST /api/admin/vendors/[id]/approve`, `POST /api/admin/vendors/[id]/suspend`, category CRUD under `/api/admin/categories` |
| Catalog    | `GET /api/categories`, `GET /api/categories/[slug]`, `GET /api/products`, `GET /api/products/[id]` |
| Vendor catalog | `GET/POST /api/vendors/me/products`, `GET/PATCH/DELETE /api/vendors/me/products/[id]` |

## Scripts

- `npm run dev` – start dev server
- `npm run build` / `npm run start` – production build and start
- `npm run db:generate` – generate Prisma client
- `npm run db:migrate` – run migrations (interactive)
- `npm run db:push` – push schema without migration (dev only)
- `npm run db:seed` – seed admin user and default categories
- `npm run db:studio` – open Prisma Studio
