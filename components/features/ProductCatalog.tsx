"use client";

import { useMemo, useState } from "react";
import ProductCard from "@/components/features/ProductCard";

export interface CatalogDisplayProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  category: string | null;
  ingredients: string[];
  isAvailable: boolean;
}

const ALL_FILTER = "All";

export default function ProductCatalog({ products }: { products: CatalogDisplayProduct[] }) {
  const categories = useMemo(() => {
    const distinct = new Set(
      products
        .map((product) => product.category)
        .filter((category): category is string => Boolean(category))
    );
    return [ALL_FILTER, ...Array.from(distinct).sort((a, b) => a.localeCompare(b))];
  }, [products]);

  const [activeFilter, setActiveFilter] = useState<string>(ALL_FILTER);

  const visibleProducts = useMemo(() => {
    if (activeFilter === ALL_FILTER) {
      // Group by category (uncategorized last) so "All" reads as tidy
      // clusters rather than raw creation order.
      return [...products].sort((a, b) => {
        if (a.category === b.category) {
          return a.name.localeCompare(b.name);
        }
        if (!a.category) return 1;
        if (!b.category) return -1;
        return a.category.localeCompare(b.category);
      });
    }
    return products.filter((product) => product.category === activeFilter);
  }, [products, activeFilter]);

  if (products.length === 0) {
    return (
      <div className="rounded-xl border-2 border-cookie-brown bg-flour-white p-6 text-cookie-brown">
        No products are available right now. Check back soon.
      </div>
    );
  }

  return (
    <div>
      {/* Renders once there's a real bake-type to filter by (2+ entries:
          "All" plus at least one category) - a single-category catalog
          still gets a working "All / Cookies" toggle rather than being
          hidden entirely, and it grows on its own as categories are added. */}
      {categories.length > 1 ? (
        <div
          className="mb-5 flex items-center gap-2 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Filter by bake type"
        >
          {categories.map((category) => {
            const isActive = category === activeFilter;
            return (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveFilter(category)}
                className={`tap-target shrink-0 whitespace-nowrap px-2 py-2 font-display uppercase text-cookie-brown transition-[font-size] duration-300 ease-out hover:text-power-red ${
                  isActive ? "text-4xl tablet:text-5xl" : "text-sm"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      ) : null}

      {visibleProducts.length === 0 ? (
        <div className="rounded-xl border-2 border-cookie-brown bg-flour-white p-6 text-cookie-brown">
          No {activeFilter.toLowerCase()} available right now.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2 desktop:grid-cols-3">
          {visibleProducts.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              description={product.description}
              price={product.price}
              imageUrl={product.imageUrl}
              category={product.category}
              ingredients={product.ingredients}
              isAvailable={product.isAvailable}
            />
          ))}
        </div>
      )}
    </div>
  );
}
