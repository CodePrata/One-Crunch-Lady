"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import { getEffectivePrice } from "@/lib/pricing";
import { useCartHasHydrated, useCartStore } from "@/lib/store/cart";

export interface CartCatalogProduct {
  id: string;
  name: string;
  /** Original (pre-discount) price - see CartCatalogLine.unitPrice for what the customer is actually charged. */
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  discountType: "PERCENT" | "FIXED" | null;
  discountValue: number | null;
}

export interface CartCatalogLine {
  product: CartCatalogProduct;
  quantity: number;
  /**
   * Effective (possibly discounted) unit price - what lineTotal is
   * computed from and what the customer is actually charged. Computed
   * via lib/pricing.ts, the same helper app/actions/orders.ts uses to
   * re-price server-side, so this can never show a different number than
   * what checkout ends up charging.
   */
  unitPrice: number;
  originalUnitPrice: number | null;
  discountLabel: string | null;
  lineTotal: number;
}

const CartCatalogContext = createContext<CartCatalogProduct[] | null>(null);

/**
 * Makes the current server-fetched product list available to the cart UI
 * (bubble + drawer) without a second client-side fetch. Wrap the storefront
 * tree with this in a Server Component, passing the same fresh
 * `is_available = true` product read used elsewhere on the page.
 */
export function CartCatalogProvider({
  products,
  children,
}: {
  products: CartCatalogProduct[];
  children: React.ReactNode;
}) {
  const hasHydrated = useCartHasHydrated();

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }
    useCartStore.getState().reconcileWithCatalog(products.map((product) => product.id));
  }, [hasHydrated, products]);

  return <CartCatalogContext.Provider value={products}>{children}</CartCatalogContext.Provider>;
}

function useCartCatalogProducts(): CartCatalogProduct[] {
  const products = useContext(CartCatalogContext);
  if (!products) {
    throw new Error("useCartCatalogProducts must be used within a CartCatalogProvider");
  }
  return products;
}

/**
 * Joins the persisted cart's {productId, quantity} lines against the
 * current server-fetched product list. Price, name, image, and availability
 * always come from `products` (this render's fresh catalog read), never
 * from anything cached in localStorage - so a cart left open for days can
 * never checkout at a stale price or a deleted/sold-out item.
 */
export function useCartCatalogItems(): {
  lines: CartCatalogLine[];
  unavailableLines: CartCatalogLine[];
  subtotal: number;
  itemCount: number;
} {
  const products = useCartCatalogProducts();
  const items = useCartStore((state) => state.items);

  return useMemo(() => {
    const productsById = new Map(products.map((product) => [product.id, product]));
    const lines: CartCatalogLine[] = [];
    const unavailableLines: CartCatalogLine[] = [];

    for (const item of items) {
      const product = productsById.get(item.productId);
      if (!product) {
        // Deleted/renamed product - reconcileWithCatalog prunes this on the
        // next effect pass. Don't render it in the meantime.
        continue;
      }

      const effective = getEffectivePrice({
        price: product.price,
        discountType: product.discountType,
        discountValue: product.discountValue,
      });

      const line: CartCatalogLine = {
        product,
        quantity: item.quantity,
        unitPrice: effective.price,
        originalUnitPrice: effective.originalPrice,
        discountLabel: effective.discountLabel,
        lineTotal: effective.price * item.quantity,
      };

      if (product.isAvailable) {
        lines.push(line);
      } else {
        unavailableLines.push(line);
      }
    }

    const subtotal = lines.reduce((total, line) => total + line.lineTotal, 0);
    const itemCount = lines.reduce((count, line) => count + line.quantity, 0);

    return { lines, unavailableLines, subtotal, itemCount };
  }, [products, items]);
}
