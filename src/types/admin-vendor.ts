import type { VendorStatus } from "@/types/enums";

export type AdminVendorSummary = {
  id: string;
  userId: string;
  status: VendorStatus;
  rejectionReason: string | null;
  approvedAt: string | null;
  approvedById: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; email: string };
  profile: {
    businessName: string;
    businessType: "INDIVIDUAL" | "COMPANY" | null;
    contactEmail: string | null;
    panOrVatNumber: string | null;
    categories: string[];
  } | null;
};

export type AdminVendorModerationLog = {
  id: string;
  action: string;
  note: string | null;
  createdAt: string;
  admin: { id: string; email: string } | null;
};

export type AdminVendorDetail = Omit<AdminVendorSummary, "profile"> & {
  termsAccepted: boolean;
  profile: {
    id: string;
    vendorId: string;
    businessName: string;
    businessType: "INDIVIDUAL" | "COMPANY" | null;
    panOrVatNumber: string | null;
    businessRegistrationNumber: string | null;
    businessAddressProvince: string | null;
    businessAddressCity: string | null;
    businessAddressFull: string | null;
    bankName: string | null;
    bankAccountNumber: string | null;
    bankAccountHolder: string | null;
    storeLogoUrl: string | null;
    storeDescription: string | null;
    storeSlug: string | null;
    categories: string[];
    documentUrl: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  moderationLogs: AdminVendorModerationLog[];
};
