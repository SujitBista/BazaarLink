-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- AlterTable
ALTER TABLE "Vendor"
ADD COLUMN "terms_accepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "rejection_reason" TEXT;

-- AlterTable
ALTER TABLE "VendorProfile"
ADD COLUMN "business_type" "BusinessType",
ADD COLUMN "pan_or_vat_number" TEXT,
ADD COLUMN "business_registration_number" TEXT,
ADD COLUMN "business_address_province" TEXT,
ADD COLUMN "business_address_city" TEXT,
ADD COLUMN "business_address_full" TEXT,
ADD COLUMN "bank_name" TEXT,
ADD COLUMN "bank_account_number" TEXT,
ADD COLUMN "bank_account_holder" TEXT,
ADD COLUMN "store_logo_url" TEXT,
ADD COLUMN "store_description" TEXT,
ADD COLUMN "store_slug" TEXT,
ADD COLUMN "categories" TEXT[] DEFAULT ARRAY[]::TEXT[];
