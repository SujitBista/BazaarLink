import HomeContent from "./home-content";

type Search = { [key: string]: string | string[] | undefined };

function firstString(v: string | string[] | undefined): string {
  if (v == null) return "";
  return typeof v === "string" ? v : v[0] ?? "";
}

export default async function HomePage({
  searchParams,
}: {
  /** Next.js 15+ passes a Promise; awaiting a plain object (Next 14) is still valid. */
  searchParams: Search | Promise<Search>;
}) {
  const sp = await searchParams;
  const q = firstString(sp.q) || firstString(sp.search);
  return (
    <>
      <HomeContent initialQ={q} />
      <div className="mx-auto max-w-6xl px-4 pb-12">
        <details className="rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-500">
          <summary className="cursor-pointer font-medium text-stone-600">API routes (development)</summary>
          <ul className="mt-3 list-inside list-disc space-y-1">
            <li>POST /api/auth/signup – signup (body: email, password, role)</li>
            <li>POST /api/auth/login – login</li>
            <li>POST /api/auth/logout – logout</li>
            <li>GET /api/auth/me – current session</li>
            <li>POST /api/vendors/register – submit vendor onboarding (auth + verified email)</li>
            <li>POST /api/vendors/onboarding – alias for vendor onboarding submission</li>
            <li>GET /api/vendors/me – my vendor profile</li>
            <li>GET/PATCH /api/vendors/[vendorId] – get/update vendor (owner)</li>
            <li>GET /api/admin/vendors – list vendors (ADMIN)</li>
            <li>POST /api/admin/vendors/[id]/approve – approve vendor</li>
            <li>POST /api/admin/vendors/[id]/suspend – suspend vendor</li>
            <li>GET /api/categories – list categories (public)</li>
            <li>GET /api/categories/[slug] – get category by slug (public)</li>
            <li>GET/POST /api/admin/categories – list/create categories (ADMIN)</li>
            <li>GET/PATCH/DELETE /api/admin/categories/[id] – category CRUD (ADMIN)</li>
            <li>GET /api/products – list ACTIVE products (public); query: categoryId, categorySlug, q/search, includeSubcategories=false</li>
            <li>GET /api/products/[id] – get product (public ACTIVE; owner sees DRAFT)</li>
            <li>GET/POST /api/vendors/me/products – list/create my products (VENDOR)</li>
            <li>GET/PATCH/DELETE /api/vendors/me/products/[id] – product CRUD (VENDOR)</li>
          </ul>
        </details>
      </div>
    </>
  );
}
