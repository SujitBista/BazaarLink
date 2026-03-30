import { redirect } from "next/navigation";
import { getResolvedSession } from "@/services/auth";
import { getVendorByUserId } from "@/services/vendor";
import { UserRole, VendorStatus } from "@/types/enums";

export const dynamic = "force-dynamic";

/**
 * Entry point for the “Vendor” nav: sends people to login, onboarding, admin queue, or dashboard.
 */
export default async function VendorEntryPage() {
  const session = await getResolvedSession();
  if (!session) {
    redirect("/vendor/login");
  }
  if (session.role === UserRole.ADMIN) {
    redirect("/admin/vendors");
  }
  const vendor = await getVendorByUserId(session.id);
  if (!vendor) {
    redirect("/vendor/onboarding");
  }
  if (vendor.status !== VendorStatus.APPROVED) {
    redirect("/vendor/onboarding");
  }
  redirect("/vendor/dashboard");
}
