import { CustomerSignupForm } from "@/components/customer-signup-form";

export default function SignupPage() {
  return (
    <main className="mx-auto min-h-[70vh] max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold text-gray-900">Create your account</h1>
      <p className="mt-2 text-sm text-gray-600">Sign up to shop, save items, and place orders.</p>

      <CustomerSignupForm />

      <p className="mt-8 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <a href="/login" className="font-medium text-orange-700 underline">
          Sign in
        </a>
      </p>
      <p className="mt-4 text-center text-sm text-gray-600">
        <a href="/shop" className="text-orange-700 underline">
          Back to shop
        </a>
      </p>
    </main>
  );
}
