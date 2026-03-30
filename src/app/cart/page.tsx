"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchApiJson } from "@/lib/client/api-json";

type CartItem = {
  id: string;
  quantity: number;
  productVariant: {
    id: string;
    price: string;
    product: { id: string; name: string };
  };
};

type Cart = { id: string; items: CartItem[] };

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setError(null);
    const res = await fetchApiJson<{ cart: Cart }>("/api/cart");
    setLoading(false);
    if (!res.ok) {
      if (res.status === 401) {
        setError("Sign in to view your cart.");
        return;
      }
      setError(res.error);
      return;
    }
    setCart(res.data.cart);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function updateQty(itemId: string, quantity: number) {
    const res = await fetchApiJson("/api/cart/items/" + itemId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    void refresh();
  }

  async function remove(itemId: string) {
    const res = await fetchApiJson("/api/cart/items/" + itemId, { method: "DELETE" });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    void refresh();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Cart</h1>
        <a href="/shop" className="text-sm text-orange-700 underline">
          Continue shopping
        </a>
      </div>

      {loading ? <p className="text-gray-600">Loading…</p> : null}
      {error ? <p className="text-sm text-red-800">{error}</p> : null}

      {cart && cart.items.length === 0 ? (
        <p className="text-sm text-gray-600">Your cart is empty.</p>
      ) : null}

      {cart && cart.items.length > 0 ? (
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {cart.items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
              <div>
                <p className="font-medium text-gray-900">{item.productVariant.product.name}</p>
                <p className="text-sm text-gray-500">${item.productVariant.price} each</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={item.quantity}
                  onChange={(e) => void updateQty(item.id, Number(e.target.value) || 1)}
                  className="w-16 rounded border border-gray-300 px-2 py-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => void remove(item.id)}
                  className="text-sm text-red-700 underline"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {cart && cart.items.length > 0 ? (
        <a
          href="/checkout"
          className="mt-8 inline-block rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white"
        >
          Checkout
        </a>
      ) : null}
    </main>
  );
}
