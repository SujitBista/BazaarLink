import { LoginForm } from "@/components/login-form";
import { safeRelativePath } from "@/lib/safe-redirect";

type Props = {
  searchParams: { next?: string } | Promise<{ next?: string }>;
};

export default async function VendorLoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  const redirectTo = safeRelativePath(sp.next, "/vendor/onboarding");
  return (
    <LoginForm
      redirectTo={redirectTo}
      title="Vendor sign in"
      subtitle="Log in to continue seller onboarding or open your seller tools."
      extraLinks={
        <>
          New to selling?{" "}
          <a href="/vendor/signup" className="font-medium text-orange-700 underline">
            Create a seller account
          </a>
        </>
      }
    />
  );
}
