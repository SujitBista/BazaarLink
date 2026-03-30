import { LoginForm } from "@/components/login-form";
import { safeRelativePath } from "@/lib/safe-redirect";

type Props = {
  searchParams: { next?: string } | Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  const redirectTo = safeRelativePath(sp.next, "/");
  return <LoginForm redirectTo={redirectTo} title="Sign in" subtitle="Use your BazaarLink account." />;
}
