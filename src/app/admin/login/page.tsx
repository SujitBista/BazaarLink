import { LoginForm } from "@/components/login-form";
import { safeRelativePath } from "@/lib/safe-redirect";

type Props = {
  searchParams: { next?: string } | Promise<{ next?: string }>;
};

export default async function AdminLoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  const redirectTo = safeRelativePath(sp.next, "/admin/vendors");
  return (
    <LoginForm
      redirectTo={redirectTo}
      title="Admin sign in"
      subtitle="Sign in to approve vendors, view analytics, and manage the marketplace."
    />
  );
}
