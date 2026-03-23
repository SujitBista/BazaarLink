export default function HomePage() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">BazaarLink</h1>
      <p className="mt-2 text-gray-600">Multi-vendor marketplace – Phase 1: Auth, vendor onboarding, product catalog.</p>
      <ul className="mt-4 list-inside list-disc text-sm text-gray-500">
        <li>POST /api/auth/signup – signup (body: email, password, role)</li>
        <li>POST /api/auth/login – login</li>
        <li>POST /api/auth/logout – logout</li>
        <li>GET /api/auth/me – current session</li>
        <li>POST /api/vendors/register – register as vendor (VENDOR role required)</li>
        <li>GET /api/vendors/me – my vendor profile</li>
        <li>GET/PATCH /api/vendors/[vendorId] – get/update vendor (owner)</li>
        <li>GET /api/admin/vendors – list vendors (ADMIN)</li>
        <li>POST /api/admin/vendors/[id]/approve – approve vendor</li>
        <li>POST /api/admin/vendors/[id]/suspend – suspend vendor</li>
        <li>GET /api/categories – list categories (public)</li>
        <li>GET /api/categories/[slug] – get category by slug (public)</li>
        <li>GET/POST /api/admin/categories – list/create categories (ADMIN)</li>
        <li>GET/PATCH/DELETE /api/admin/categories/[id] – category CRUD (ADMIN)</li>
        <li>GET /api/products – list ACTIVE products (public)</li>
        <li>GET /api/products/[id] – get product (public ACTIVE; owner sees DRAFT)</li>
        <li>GET/POST /api/vendors/me/products – list/create my products (VENDOR)</li>
        <li>GET/PATCH/DELETE /api/vendors/me/products/[id] – product CRUD (VENDOR)</li>
      </ul>
    </main>
  );
}
