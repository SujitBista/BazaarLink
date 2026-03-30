export type ProductCardData = {
  id: string;
  name: string;
  images: { url: string }[];
  variants: { price: string }[];
  category: { name: string };
  vendor: { profile: { businessName: string } | null };
};

export function ProductCard({ product }: { product: ProductCardData }) {
  const img = product.images[0]?.url;
  const price = product.variants[0]?.price;
  return (
    <li className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-orange-200 hover:shadow-md">
      <a href={`/shop/product/${product.id}`} className="block">
        <div className="aspect-square w-full overflow-hidden rounded-md bg-gray-100">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-gray-400">No image</div>
          )}
        </div>
        <p className="mt-2 text-xs text-orange-800/90">{product.category.name}</p>
        <h2 className="mt-0.5 font-medium text-gray-900">{product.name}</h2>
        <p className="mt-1 text-xs text-gray-500">{product.vendor.profile?.businessName ?? "Seller"}</p>
        {price != null ? <p className="mt-2 text-sm font-semibold text-gray-900">${price}</p> : null}
      </a>
    </li>
  );
}
