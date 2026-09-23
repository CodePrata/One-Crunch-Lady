"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearProductDiscount,
  createProduct,
  setProductDiscount,
  toggleProductAvailability,
  updateProduct,
} from "@/app/actions/admin";
import CloudinaryImageField from "@/components/features/admin/CloudinaryImageField";

interface AdminProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  ingredients: string | null;
  category?: string | null;
  is_available: boolean;
  discount_type: "PERCENT" | "FIXED" | null;
  discount_value: number | null;
}

interface ProductDraft {
  name: string;
  description: string;
  price: string;
  image_url: string;
  category: string;
  ingredients: string;
}

const EMPTY_PRODUCT_DRAFT: ProductDraft = {
  name: "",
  description: "",
  price: "",
  image_url: "",
  category: "",
  ingredients: "",
};

interface DiscountDraft {
  discount_type: "PERCENT" | "FIXED";
  discount_value: string;
}

function discountLabel(product: AdminProduct): string | null {
  if (!product.discount_type || product.discount_value === null) {
    return null;
  }
  return product.discount_type === "PERCENT"
    ? `${product.discount_value}% OFF`
    : `$${Number(product.discount_value).toFixed(2)} OFF`;
}

/**
 * Split out of the original single-file AdminOrdersClient - see that
 * file's own doc comment for why.
 */
export default function AdminProductsPanel({
  initialProducts,
  onFeedback,
}: {
  initialProducts: AdminProduct[];
  onFeedback: (message: string) => void;
}) {
  const router = useRouter();
  const [products, setProducts] = useState<AdminProduct[]>(initialProducts);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<ProductDraft>(EMPTY_PRODUCT_DRAFT);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<ProductDraft>(EMPTY_PRODUCT_DRAFT);
  const [discountEditingProductId, setDiscountEditingProductId] = useState<string | null>(null);
  const [discountDraft, setDiscountDraft] = useState<DiscountDraft>({
    discount_type: "PERCENT",
    discount_value: "",
  });

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  async function handleToggleProduct(productId: string, isAvailable: boolean) {
    try {
      await toggleProductAvailability(productId, isAvailable);
      onFeedback("Product availability updated.");
      setProducts((current) =>
        current.map((product) =>
          product.id === productId ? { ...product, is_available: isAvailable } : product
        )
      );
      router.refresh();
    } catch (error) {
      onFeedback(error instanceof Error ? error.message : "Failed to update product.");
    }
  }

  async function handleCreateProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await createProduct({
        ...newProduct,
        price: Number(newProduct.price),
      });
      onFeedback("Product created.");
      setNewProduct(EMPTY_PRODUCT_DRAFT);
      setIsCreatingProduct(false);
      router.refresh();
    } catch (error) {
      onFeedback(error instanceof Error ? error.message : "Failed to create product.");
    }
  }

  function startEditingProduct(product: AdminProduct) {
    setEditingProductId(product.id);
    setEditDraft({
      name: product.name,
      description: product.description,
      price: String(product.price),
      image_url: product.image_url ?? "",
      category: product.category ?? "",
      ingredients: product.ingredients ?? "",
    });
  }

  async function handleSaveEdit(productId: string) {
    try {
      await updateProduct(productId, {
        ...editDraft,
        price: Number(editDraft.price),
      });
      onFeedback("Product updated.");
      setEditingProductId(null);
      router.refresh();
    } catch (error) {
      onFeedback(error instanceof Error ? error.message : "Failed to update product.");
    }
  }

  function startEditingDiscount(product: AdminProduct) {
    setDiscountEditingProductId(product.id);
    setDiscountDraft({
      discount_type: product.discount_type ?? "PERCENT",
      discount_value: product.discount_value !== null ? String(product.discount_value) : "",
    });
  }

  async function handleSaveDiscount(productId: string) {
    try {
      await setProductDiscount(productId, {
        discount_type: discountDraft.discount_type,
        discount_value: Number(discountDraft.discount_value),
      });
      onFeedback("Discount applied.");
      setDiscountEditingProductId(null);
      router.refresh();
    } catch (error) {
      onFeedback(error instanceof Error ? error.message : "Failed to set discount.");
    }
  }

  async function handleClearDiscount(productId: string) {
    try {
      await clearProductDiscount(productId);
      onFeedback("Discount cleared.");
      setDiscountEditingProductId(null);
      router.refresh();
    } catch (error) {
      onFeedback(error instanceof Error ? error.message : "Failed to clear discount.");
    }
  }

  return (
    <>
      <section className="mb-8 rounded-2xl border-[3px] border-cookie-brown bg-flour-white p-6">
        <button
          type="button"
          onClick={() => setIsCreatingProduct((current) => !current)}
          className="tap-target rounded-md border-[3px] border-cookie-brown bg-power-red px-5 font-bold text-flour-white"
        >
          Add New Product
        </button>

        {isCreatingProduct ? (
          <form onSubmit={handleCreateProduct} className="mt-4 grid gap-3">
            <input
              required
              placeholder="Name"
              value={newProduct.name}
              onChange={(event) =>
                setNewProduct((current) => ({ ...current, name: event.target.value }))
              }
              className="tap-target rounded-md border-2 border-cookie-brown px-3"
            />
            <textarea
              required
              placeholder="Description"
              value={newProduct.description}
              onChange={(event) =>
                setNewProduct((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              className="rounded-md border-2 border-cookie-brown px-3 py-2"
              rows={3}
            />
            <div className="grid gap-3 tablet:grid-cols-2">
              <input
                required
                placeholder="Price"
                type="number"
                min="0"
                step="0.01"
                value={newProduct.price}
                onChange={(event) =>
                  setNewProduct((current) => ({
                    ...current,
                    price: event.target.value,
                  }))
                }
                className="tap-target rounded-md border-2 border-cookie-brown px-3"
              />
              <input
                placeholder="Category (e.g. Cookies, Muffins, Cakes)"
                value={newProduct.category}
                onChange={(event) =>
                  setNewProduct((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
                className="tap-target rounded-md border-2 border-cookie-brown px-3"
              />
            </div>
            <input
              required
              placeholder="Ingredients (comma-separated)"
              value={newProduct.ingredients}
              onChange={(event) =>
                setNewProduct((current) => ({
                  ...current,
                  ingredients: event.target.value,
                }))
              }
              className="tap-target rounded-md border-2 border-cookie-brown px-3"
            />

            <CloudinaryImageField
              value={newProduct.image_url}
              onChange={(url) => setNewProduct((current) => ({ ...current, image_url: url }))}
              buttonLabel="Upload Product Image"
            />

            <button
              type="submit"
              className="tap-target rounded-md border-2 border-cookie-brown bg-hero-yellow px-4 font-semibold text-cookie-brown-dark"
            >
              Create Product
            </button>
          </form>
        ) : null}
      </section>

      <section className="rounded-2xl border-[3px] border-cookie-brown bg-flour-white p-6">
        <h2 className="font-display text-4xl uppercase text-cookie-brown-dark">
          Product Management
        </h2>
        <div className="mt-4 space-y-3">
          {products.map((product) => (
            <div key={product.id} className="rounded-xl border-2 border-cookie-brown p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold text-cookie-brown-dark">{product.name}</p>
                <button
                  type="button"
                  onClick={() => handleToggleProduct(product.id, !product.is_available)}
                  className={`tap-target rounded-md border-2 border-cookie-brown px-4 text-sm font-semibold ${
                    product.is_available
                      ? "bg-hero-yellow text-cookie-brown-dark"
                      : "bg-cookie-brown text-flour-white"
                  }`}
                >
                  {product.is_available ? "Deactivate" : "Activate"}
                </button>
              </div>

              {/* Discount controls - independent of the edit-product form
                  below, since a discount is a separate, smaller action an
                  admin reaches for more often than a full product edit. */}
              <div className="mb-3 rounded-md border-2 border-cookie-brown/40 p-3">
                {discountEditingProductId === product.id ? (
                  <div className="grid gap-2 tablet:grid-cols-[auto,1fr] tablet:items-center">
                    <select
                      value={discountDraft.discount_type}
                      onChange={(event) =>
                        setDiscountDraft((current) => ({
                          ...current,
                          discount_type: event.target.value as "PERCENT" | "FIXED",
                        }))
                      }
                      className="tap-target rounded-md border-2 border-cookie-brown px-3"
                    >
                      <option value="PERCENT">Percentage (%)</option>
                      <option value="FIXED">Fixed amount ($)</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={discountDraft.discount_type === "PERCENT" ? "e.g. 20" : "e.g. 2.00"}
                      value={discountDraft.discount_value}
                      onChange={(event) =>
                        setDiscountDraft((current) => ({
                          ...current,
                          discount_value: event.target.value,
                        }))
                      }
                      className="tap-target rounded-md border-2 border-cookie-brown px-3"
                    />
                    <div className="flex gap-2 tablet:col-span-2">
                      <button
                        type="button"
                        onClick={() => handleSaveDiscount(product.id)}
                        className="tap-target rounded-md border-2 border-cookie-brown bg-hero-yellow px-4 text-sm font-semibold text-cookie-brown-dark"
                      >
                        Save Discount
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountEditingProductId(null)}
                        className="tap-target rounded-md border-2 border-cookie-brown px-4 text-sm font-semibold text-cookie-brown-dark"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-cookie-brown-dark">
                      {discountLabel(product) ? (
                        <span className="rounded-md bg-power-red px-2 py-1 text-xs font-bold uppercase text-flour-white">
                          {discountLabel(product)}
                        </span>
                      ) : (
                        "No discount"
                      )}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEditingDiscount(product)}
                        className="tap-target rounded-md border-2 border-cookie-brown px-3 text-xs font-semibold text-cookie-brown-dark"
                      >
                        {discountLabel(product) ? "Edit Discount" : "Set Discount"}
                      </button>
                      {discountLabel(product) ? (
                        <button
                          type="button"
                          onClick={() => handleClearDiscount(product.id)}
                          className="tap-target rounded-md border-2 border-cookie-brown px-3 text-xs font-semibold text-cookie-brown-dark"
                        >
                          Clear Discount
                        </button>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>

              {editingProductId === product.id ? (
                <div className="grid gap-2">
                  <input
                    value={editDraft.name}
                    onChange={(event) =>
                      setEditDraft((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    className="tap-target rounded-md border-2 border-cookie-brown px-3"
                  />
                  <textarea
                    value={editDraft.description}
                    onChange={(event) =>
                      setEditDraft((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    className="rounded-md border-2 border-cookie-brown px-3 py-2"
                    rows={3}
                  />
                  <div className="grid gap-2 tablet:grid-cols-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editDraft.price}
                      onChange={(event) =>
                        setEditDraft((current) => ({
                          ...current,
                          price: event.target.value,
                        }))
                      }
                      className="tap-target rounded-md border-2 border-cookie-brown px-3"
                    />
                    <input
                      placeholder="Category (e.g. Cookies, Muffins, Cakes)"
                      value={editDraft.category}
                      onChange={(event) =>
                        setEditDraft((current) => ({
                          ...current,
                          category: event.target.value,
                        }))
                      }
                      className="tap-target rounded-md border-2 border-cookie-brown px-3"
                    />
                  </div>
                  <input
                    value={editDraft.ingredients}
                    onChange={(event) =>
                      setEditDraft((current) => ({
                        ...current,
                        ingredients: event.target.value,
                      }))
                    }
                    className="tap-target rounded-md border-2 border-cookie-brown px-3"
                  />

                  <CloudinaryImageField
                    value={editDraft.image_url}
                    onChange={(url) => setEditDraft((current) => ({ ...current, image_url: url }))}
                    buttonLabel="Replace Image"
                    selectedLabel="Image selected"
                    emptyLabel="No new image"
                  />

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(product.id)}
                      className="tap-target rounded-md border-2 border-cookie-brown bg-hero-yellow px-4 text-sm font-semibold text-cookie-brown-dark"
                    >
                      Save Product
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingProductId(null)}
                      className="tap-target rounded-md border-2 border-cookie-brown px-4 text-sm font-semibold text-cookie-brown-dark"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => startEditingProduct(product)}
                  className="tap-target rounded-md border-2 border-cookie-brown px-4 text-sm font-semibold text-cookie-brown-dark"
                >
                  Edit Product
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
