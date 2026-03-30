import ShopBrowse from "./shop-browse";

type Search = { [key: string]: string | string[] | undefined };

function firstString(v: string | string[] | undefined): string {
  if (v == null) return "";
  return typeof v === "string" ? v : v[0] ?? "";
}

export default function ShopPage({ searchParams }: { searchParams: Search }) {
  const category =
    firstString(searchParams.category) || firstString(searchParams.categorySlug);
  const q = firstString(searchParams.q) || firstString(searchParams.search);
  return <ShopBrowse initialCategorySlug={category} initialQ={q} />;
}
