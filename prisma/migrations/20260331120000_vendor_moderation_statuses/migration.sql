-- CreateEnum
CREATE TYPE "VendorModerationAction" AS ENUM ('APPROVE', 'REQUEST_CHANGES', 'REJECT', 'SUSPEND');

-- AlterEnum: extend VendorStatus (values append in Postgres; Prisma matches by label)
ALTER TYPE "VendorStatus" ADD VALUE 'DRAFT';
ALTER TYPE "VendorStatus" ADD VALUE 'CHANGES_REQUESTED';
ALTER TYPE "VendorStatus" ADD VALUE 'REJECTED';

-- CreateTable
CREATE TABLE "vendor_moderation_logs" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "action" "VendorModerationAction" NOT NULL,
    "note" TEXT,
    "admin_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_moderation_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "vendor_moderation_logs_vendor_id_idx" ON "vendor_moderation_logs"("vendor_id");

ALTER TABLE "vendor_moderation_logs" ADD CONSTRAINT "vendor_moderation_logs_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vendor_moderation_logs" ADD CONSTRAINT "vendor_moderation_logs_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
