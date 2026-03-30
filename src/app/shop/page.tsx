import ShopBrowse from "./shop-browse";

type Search = { [key: string]: string | string[] | undefined };

function firstString(v: string | string[] | undefined): string {
  if (v == null) return "";
  return typeof v === "string" ? v : v[0] ?? "";
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Search | Promise<Search>;
}) {
  const sp = await searchParams;
  const category =
    firstString(sp.category) || firstString(sp.categorySlug);
  const q = firstString(sp.q) || firstString(sp.search);
  return <ShopBrowse initialCategorySlug={category} initialQ={q} />;
}
