/**
 * Local development seed for the MVP Prisma subset (see prisma/schema.prisma).
 *
 * This script WIPES all rows in MVP tables (users through commissions) and
 * repopulates deterministic demo data. Safe for local DBs only.
 *
 * Run: npm run db:seed
 *
 * Optional env:
 *   SEED_ADMIN_PASSWORD   (default: admin-change-me)
 *   SEED_DEMO_PASSWORD    (default: demo-change-me) — customer + vendor logins
 */
import { PrismaClient, Prisma, UserRole, VendorStatus, ProductStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

async function wipeMvpTables() {
  await prisma.commission.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.updateMany({ data: { parentId: null } });
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.vendorProfile.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.user.deleteMany();
}

function money(value: string) {
  return new Prisma.Decimal(value);
}

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin-change-me";
  const demoPassword = process.env.SEED_DEMO_PASSWORD ?? "demo-change-me";

  console.log("Clearing MVP tables for a clean local seed…");
  await wipeMvpTables();

  const adminHash = await bcrypt.hash(adminPassword, SALT_ROUNDS);
  const demoHash = await bcrypt.hash(demoPassword, SALT_ROUNDS);

  const admin = await prisma.user.create({
    data: {
      email: "admin@bazaarlink.local",
      passwordHash: adminHash,
      role: UserRole.ADMIN,
      emailVerified: true,
    },
  });

  const customer = await prisma.user.create({
    data: {
      email: "maya.patel@bazaarlink.local",
      passwordHash: demoHash,
      role: UserRole.CUSTOMER,
      emailVerified: true,
    },
  });

  const vendorApprovedUser = await prisma.user.create({
    data: {
      email: "ravi.thapa@bazaarlink.local",
      passwordHash: demoHash,
      role: UserRole.VENDOR,
      emailVerified: true,
    },
  });

  const vendorPendingUser = await prisma.user.create({
    data: {
      email: "anita.sharma@bazaarlink.local",
      passwordHash: demoHash,
      role: UserRole.VENDOR,
      emailVerified: true,
    },
  });

  const vendorApproved = await prisma.vendor.create({
    data: {
      userId: vendorApprovedUser.id,
      status: VendorStatus.APPROVED,
      approvedAt: new Date("2025-02-10T10:00:00.000Z"),
      approvedById: admin.id,
    },
  });

  const vendorPending = await prisma.vendor.create({
    data: {
      userId: vendorPendingUser.id,
      status: VendorStatus.PENDING,
    },
  });

  await prisma.vendorProfile.create({
    data: {
      vendorId: vendorApproved.id,
      businessName: "Himalayan Goods Co.",
      documentUrl: "https://example.com/kyc/himalayan-goods-registration.pdf",
      contactEmail: "hello@himalayangoods.example",
      contactPhone: "+977-1-5550142",
    },
  });

  await prisma.vendorProfile.create({
    data: {
      vendorId: vendorPending.id,
      businessName: "Pure Craft Studio",
      documentUrl: "https://example.com/kyc/pure-craft-pending.pdf",
      contactEmail: "anita@purecraft.example",
      contactPhone: "+977-1-5550199",
    },
  });

  await prisma.address.createMany({
    data: [
      {
        userId: customer.id,
        label: "Home",
        line1: "17 Lazimpat Road",
        line2: "Apartment 4B",
        city: "Kathmandu",
        state: "Bagmati",
        postalCode: "44600",
        country: "NP",
      },
      {
        userId: customer.id,
        label: "Office",
        line1: "44 Durbar Marg",
        line2: "Floor 3, East Wing",
        city: "Kathmandu",
        state: "Bagmati",
        postalCode: "44600",
        country: "NP",
      },
      {
        userId: vendorApprovedUser.id,
        label: "Warehouse pickup",
        line1: "88 Balaju Industrial District",
        line2: "Unit 12",
        city: "Kathmandu",
        state: "Bagmati",
        postalCode: "44616",
        country: "NP",
      },
    ],
  });

  const catFashion = await prisma.category.create({
    data: { name: "Fashion", slug: "fashion" },
  });
  const catHome = await prisma.category.create({
    data: { name: "Home & Living", slug: "home-living" },
  });

  const catFootwear = await prisma.category.create({
    data: {
      name: "Footwear",
      slug: "fashion-footwear",
      parentId: catFashion.id,
    },
  });
  const catAccessories = await prisma.category.create({
    data: {
      name: "Accessories",
      slug: "fashion-accessories",
      parentId: catFashion.id,
    },
  });
  const catKitchen = await prisma.category.create({
    data: {
      name: "Kitchen & Pantry",
      slug: "home-kitchen-pantry",
      parentId: catHome.id,
    },
  });
  const catTextiles = await prisma.category.create({
    data: {
      name: "Textiles",
      slug: "home-textiles",
      parentId: catHome.id,
    },
  });

  const honey = await prisma.product.create({
    data: {
      vendorId: vendorApproved.id,
      categoryId: catKitchen.id,
      name: "Organic Wild Honey (Mustard Blossom)",
      slug: "organic-wild-honey-mustard-blossom",
      description:
        "Cold-filtered, small-batch honey sourced from highland mustard fields. Glass jar, batch traceable.",
      status: ProductStatus.ACTIVE,
    },
  });

  const scarf = await prisma.product.create({
    data: {
      vendorId: vendorApproved.id,
      categoryId: catAccessories.id,
      name: "Handwoven Dhaka Scarf",
      slug: "handwoven-dhaka-scarf",
      description:
        "Traditional Dhaka weave in breathable cotton blend. Finished edges, suitable for year-round wear.",
      status: ProductStatus.ACTIVE,
    },
  });

  const sneakers = await prisma.product.create({
    data: {
      vendorId: vendorApproved.id,
      categoryId: catFootwear.id,
      name: "Trail Runner Sneakers — Monsoon Edition",
      slug: "trail-runner-sneakers-monsoon",
      description:
        "Grippy rubber outsole, quick-dry mesh upper, reinforced toe cap. Designed for wet urban trails.",
      status: ProductStatus.ACTIVE,
    },
  });

  const pendingMug = await prisma.product.create({
    data: {
      vendorId: vendorPending.id,
      categoryId: catKitchen.id,
      name: "Artisan Glazed Ceramic Mug (Set of 2)",
      slug: "artisan-ceramic-mug-set-2",
      description:
        "Lead-free glaze, microwave safe. Awaiting vendor approval before going live.",
      status: ProductStatus.DRAFT,
    },
  });

  await prisma.productImage.createMany({
    data: [
      {
        productId: honey.id,
        url: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&q=80",
        sortOrder: 0,
      },
      {
        productId: honey.id,
        url: "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=800&q=80",
        sortOrder: 1,
      },
      {
        productId: scarf.id,
        url: "https://images.unsplash.com/photo-1520903920243-92d4c7a35d05?w=800&q=80",
        sortOrder: 0,
      },
      {
        productId: scarf.id,
        url: "https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?w=800&q=80",
        sortOrder: 1,
      },
      {
        productId: sneakers.id,
        url: "https://images.unsplash.com/photo-1542291026-7eec264c27b6?w=800&q=80",
        sortOrder: 0,
      },
      {
        productId: sneakers.id,
        url: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&q=80",
        sortOrder: 1,
      },
      {
        productId: pendingMug.id,
        url: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80",
        sortOrder: 0,
      },
    ],
  });

  await prisma.productVariant.createMany({
    data: [
      {
        productId: honey.id,
        sku: "HGC-HNY-MUST-500",
        price: money("18.50"),
        stock: 120,
        attributes: { size: "500 g", jar: "glass" } satisfies Prisma.JsonObject,
      },
      {
        productId: honey.id,
        sku: "HGC-HNY-MUST-250",
        price: money("10.25"),
        stock: 80,
        attributes: { size: "250 g", jar: "glass" } satisfies Prisma.JsonObject,
      },
      {
        productId: scarf.id,
        sku: "HGC-SCF-DHAKA-FOREST",
        price: money("24.00"),
        stock: 45,
        attributes: { color: "Forest green", widthCm: 35, lengthCm: 180 } satisfies Prisma.JsonObject,
      },
      {
        productId: scarf.id,
        sku: "HGC-SCF-DHAKA-INDIGO",
        price: money("24.00"),
        stock: 32,
        attributes: { color: "Indigo", widthCm: 35, lengthCm: 180 } satisfies Prisma.JsonObject,
      },
      {
        productId: sneakers.id,
        sku: "HGC-SNK-MONSOON-40",
        price: money("89.99"),
        stock: 15,
        attributes: { euSize: 40, color: "Slate / lime accent" } satisfies Prisma.JsonObject,
      },
      {
        productId: sneakers.id,
        sku: "HGC-SNK-MONSOON-42",
        price: money("89.99"),
        stock: 22,
        attributes: { euSize: 42, color: "Slate / lime accent" } satisfies Prisma.JsonObject,
      },
      {
        productId: sneakers.id,
        sku: "HGC-SNK-MONSOON-44",
        price: money("91.99"),
        stock: 9,
        attributes: { euSize: 44, color: "Slate / lime accent" } satisfies Prisma.JsonObject,
      },
      {
        productId: pendingMug.id,
        sku: "PCS-MUG-SET2-STONE",
        price: money("32.00"),
        stock: 10,
        attributes: { finish: "Stone blue glaze", quantity: 2 } satisfies Prisma.JsonObject,
      },
    ],
  });

  console.log("\n=== BazaarLink local seed complete ===\n");
  console.log("Tables cleared and repopulated: User → Vendor → VendorProfile, Address, Category, Product, ProductImage, ProductVariant.");
  console.log("(Orders, commissions, cart, payments, etc. are not seeded.)\n");

  console.log("Users (passwords: see SEED_* env or defaults below)");
  console.log(`  ADMIN     ${admin.email}  /  ${adminPassword}`);
  console.log(`  CUSTOMER  ${customer.email}  /  ${demoPassword}`);
  console.log(`  VENDOR ✓  ${vendorApprovedUser.email}  /  ${demoPassword}  (APPROVED — Himalayan Goods Co.)`);
  console.log(`  VENDOR ⏳ ${vendorPendingUser.email}  /  ${demoPassword}  (PENDING — Pure Craft Studio)\n`);

  console.log("RBAC: ADMIN vs CUSTOMER vs VENDOR roles on the User model.");
  console.log("Vendor approval: ravi’s vendor row is APPROVED with approvedBy = admin user; anita’s is PENDING.\n");

  console.log("Addresses: 2 for the customer (Home, Office), 1 for the approved vendor user (Warehouse pickup).");
  console.log("Categories: Fashion → Footwear, Accessories; Home & Living → Kitchen & Pantry, Textiles.");
  console.log("Catalog: 3 ACTIVE products (+ images + variants) on approved vendor; 1 DRAFT product on pending vendor.\n");

  console.log("Slugs: unique category slugs; product slugs unique per vendor.");
  console.log("SKUs: HGC-* and PCS-* prefixes so (productId, sku) stays unique and human-readable.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
