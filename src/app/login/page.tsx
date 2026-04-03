import { LoginForm } from "@/components/login-form";
import { safeRelativePath } from "@/lib/safe-redirect";

type Search = { [key: string]: string | string[] | undefined };

export default async function LoginPage({ searchParams }: { searchParams: Search | Promise<Search> }) {
  const sp = await searchParams;
  const rawNext = sp.next;
  const nextStr = Array.isArray(rawNext) ? rawNext[0] : rawNext;
  const next = safeRelativePath(nextStr, "/shop");
  const registered = sp.registered === "1" || sp.registered === "true";

  return (
    <LoginForm
      redirectTo={next}
      title="Sign in"
      subtitle="Sign in to continue shopping and checkout."
      successMessage={registered ? "Account created successfully. You can sign in below." : undefined}
      extraLinks={
        <p>
          Don&apos;t have an account?{" "}
          <a href="/signup" className="font-medium text-orange-700 underline">
            Sign up
          </a>
        </p>
      }
    />
  );
}
