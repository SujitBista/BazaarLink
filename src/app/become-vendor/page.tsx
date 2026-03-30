import { redirect } from "next/navigation";
import { getResolvedSession, getUserAuthProfileById } from "@/services/auth";
import { BecomeVendorClient } from "./become-vendor-client";

export default async function BecomeVendorPage() {
  const session = await getResolvedSession();
  if (session) {
    const user = await getUserAuthProfileById(session.id);
    if (user) {
      redirect("/vendor/onboarding");
    }
  }
  return <BecomeVendorClient />;
}
