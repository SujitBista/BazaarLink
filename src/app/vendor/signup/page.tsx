import { redirect } from "next/navigation";
import { getResolvedSession, getUserAuthProfileById } from "@/services/auth";
import { VendorSignupClient } from "./vendor-signup-client";

export default async function VendorSignupPage() {
  const session = await getResolvedSession();
  if (session) {
    const user = await getUserAuthProfileById(session.id);
    if (user) {
      redirect("/vendor/onboarding");
    }
  }
  return <VendorSignupClient />;
}
