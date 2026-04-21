"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CldUploadWidget } from "next-cloudinary";
import {
  createProduct,
  toggleProductAvailability,
  updateOrderStatus,
  updateProduct,
} from "@/app/actions/admin";
import { createClient } from "@/lib/supabase/client";

type OrderStatus = "UNPAID" | "PAID" | "READY";
type UpdatableOrderStatus = "PAID" | "READY";
type StatusTab = "ALL" | OrderStatus;

interface AdminOrder {
  id: number;
  order_ref: string;
  customer_name: string;
  customer_email: string;
  total_price: number;
  status: string;
  created_at: string;
}

interface AdminProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  ingredients: string | null;
  category?: string | null;
  is_available: boolean;
}

interface AdminOrdersClientProps {
  initialOrders: AdminOrder[];
  initialProducts: AdminProduct[];
}

interface ProductDraft {
  name: string;
  description: string;
  price: string;
  image_url: string;
  category: string;
  ingredients: string;
}

const TABS: Array<{ id: StatusTab; label: string }> = [
  { id: "ALL", label: "All" },
  { id: "UNPAID", label: "Unpaid" },
  { id: "PAID", label: "Paid" },
  { id: "READY", label: "Ready" },
];

export default function AdminOrdersClient({
  initialOrders,
  initialProducts,
}: AdminOrdersClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const [orders, setOrders] = useState<AdminOrder[]>(initialOrders);
  const [products, setProducts] = useState<AdminProduct[]>(initialProducts);
  const [activeTab, setActiveTab] = useState<StatusTab>("ALL");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<ProductDraft>({
    name: "",
    description: "",
    price: "",
    image_url: "",
    category: "",
    ingredients: "",
  });
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<ProductDraft>({
    name: "",
    description: "",
    price: "",
    image_url: "",
    category: "",
    ingredients: "",
  });

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-orders-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const nextOrder = payload.new as AdminOrder;
          setOrders((current) => [nextOrder, ...current]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          const updatedOrder = payload.new as AdminOrder;
          setOrders((current) =>
            current.map((order) =>
              order.id === updatedOrder.id ? updatedOrder : order
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const filteredOrders = useMemo(() => {
    if (activeTab === "ALL") {
      return orders;
    }
    return orders.filter((order) => order.status === activeTab);
  }, [activeTab, orders]);

  async function handleStatusUpdate(orderId: number, status: UpdatableOrderStatus) {
    const confirmed = window.confirm(
      `Confirm update: mark this order as ${status}?`
    );
    if (!confirmed) {
      return;
    }

    try {
      await updateOrderStatus(orderId, status);
      setFeedback(`Order updated to ${status}.`);
      router.refresh();
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Failed to update status."
      );
    }
  }

  async function handleToggleProduct(productId: string, isAvailable: boolean) {
    try {
      await toggleProductAvailability(productId, isAvailable);
      setFeedback("Product availability updated.");
      setProducts((current) =>
        current.map((product) =>
          product.id === productId
            ? { ...product, is_available: isAvailable }
            : product
        )
      );
      router.refresh();
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Failed to update product."
      );
    }
  }

  async function handleCreateProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await createProduct({
        ...newProduct,
        price: Number(newProduct.price),
      });
      setFeedback("Product created.");
      setNewProduct({
        name: "",
        description: "",
        price: "",
        image_url: "",
        category: "",
        ingredients: "",
      });
      setIsCreatingProduct(false);
      router.refresh();
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Failed to create product."
      );
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
      setFeedback("Product updated.");
      setEditingProductId(null);
      router.refresh();
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Failed to update product."
      );
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <main className="responsive-shell px-4 py-10 tablet:px-6 desktop:px-8">
      <section className="mb-8 rounded-2xl border-[3px] border-cookie-brown bg-flour-white p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="font-display text-5xl uppercase text-cookie-brown">
            Admin Orders
          </h1>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.refresh()}
              className="tap-target rounded-md border-2 border-cookie-brown px-4 font-semibold text-cookie-brown"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="tap-target rounded-md border-[3px] border-cookie-brown bg-power-red px-4 font-semibold text-flour-white"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`tap-target rounded-md border-2 border-cookie-brown px-3 text-sm font-semibold ${
                activeTab === tab.id
                  ? "bg-cookie-brown text-flour-white"
                  : "bg-flour-white text-cookie-brown"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <article
              key={order.id}
              className="rounded-lg border-2 border-cookie-brown p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-display text-3xl uppercase text-cookie-brown">
                    {order.order_ref}
                  </p>
                  <p className="text-sm text-cookie-brown">{order.customer_name}</p>
                  <p className="text-sm font-semibold text-cookie-brown">
                    ${Number(order.total_price).toFixed(2)}
                  </p>
                  <span
                    className={`mt-1 inline-flex rounded px-2 py-1 text-xs font-bold uppercase ${
                      order.status === "UNPAID"
                        ? "bg-gray-300 text-black"
                        : order.status === "PAID"
                          ? "bg-green-600 text-white"
                          : "bg-power-red text-white"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="tap-target rounded-md border-2 border-cookie-brown bg-hero-yellow px-4 text-sm font-semibold text-cookie-brown disabled:opacity-60"
                    disabled={order.status !== "UNPAID"}
                    onClick={() => handleStatusUpdate(order.id, "PAID")}
                  >
                    Mark as Paid
                  </button>
                  <button
                    type="button"
                    className="tap-target rounded-md border-[3px] border-cookie-brown bg-power-red px-4 text-sm font-semibold text-flour-white disabled:opacity-60"
                    disabled={order.status === "READY"}
                    onClick={() => handleStatusUpdate(order.id, "READY")}
                  >
                    Mark as Ready
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

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

            <div className="flex items-center gap-3">
              <CldUploadWidget
                uploadPreset={
                  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ??
                  "one_crunch_uploads"
                }
                options={{
                  maxFiles: 1,
                  resourceType: "image",
                  clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
                  maxFileSize: 10_000_000,
                }}
                onSuccess={(result) => {
                  const info = result?.info as { secure_url?: string };
                  if (info?.secure_url) {
                    setNewProduct((current) => ({
                      ...current,
                      image_url: info.secure_url ?? "",
                    }));
                  }
                }}
              >
                {({ open }) => (
                  <button
                    type="button"
                    onClick={() => open()}
                    className="tap-target rounded-md border-2 border-cookie-brown px-3 text-sm font-semibold text-cookie-brown"
                  >
                    Upload Product Image
                  </button>
                )}
              </CldUploadWidget>
              <span className="text-sm text-cookie-brown">
                {newProduct.image_url ? "Image selected" : "No image uploaded"}
              </span>
            </div>

            <button
              type="submit"
              className="tap-target rounded-md border-2 border-cookie-brown bg-hero-yellow px-4 font-semibold text-cookie-brown"
            >
              Create Product
            </button>
          </form>
        ) : null}
      </section>

      <section className="rounded-2xl border-[3px] border-cookie-brown bg-flour-white p-6">
        <h2 className="font-display text-4xl uppercase text-cookie-brown">
          Product Management
        </h2>
        <div className="mt-4 space-y-3">
          {products.map((product) => (
            <div
              key={product.id}
              className="rounded-lg border-2 border-cookie-brown p-3"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold text-cookie-brown">{product.name}</p>
                <button
                  type="button"
                  onClick={() =>
                    handleToggleProduct(product.id, !product.is_available)
                  }
                  className={`tap-target rounded-md border-2 border-cookie-brown px-4 text-sm font-semibold ${
                    product.is_available
                      ? "bg-hero-yellow text-cookie-brown"
                      : "bg-cookie-brown text-flour-white"
                  }`}
                >
                  {product.is_available ? "Deactivate" : "Activate"}
                </button>
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

                  <div className="flex items-center gap-2">
                    <CldUploadWidget
                      uploadPreset={
                        process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ??
                        "onecrunchlady_webp"
                      }
                      options={{
                        maxFiles: 1,
                        resourceType: "image",
                        clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
                        maxFileSize: 10_000_000,
                      }}
                      onSuccess={(result) => {
                        const info = result?.info as { secure_url?: string };
                        if (info?.secure_url) {
                          setEditDraft((current) => ({
                            ...current,
                            image_url: info.secure_url ?? "",
                          }));
                        }
                      }}
                    >
                      {({ open }) => (
                        <button
                          type="button"
                          onClick={() => open()}
                          className="tap-target rounded-md border-2 border-cookie-brown px-3 text-sm font-semibold text-cookie-brown"
                        >
                          Replace Image
                        </button>
                      )}
                    </CldUploadWidget>
                    <span className="text-sm text-cookie-brown">
                      {editDraft.image_url ? "Image selected" : "No new image"}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(product.id)}
                      className="tap-target rounded-md border-2 border-cookie-brown bg-hero-yellow px-4 text-sm font-semibold text-cookie-brown"
                    >
                      Save Product
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingProductId(null)}
                      className="tap-target rounded-md border-2 border-cookie-brown px-4 text-sm font-semibold text-cookie-brown"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => startEditingProduct(product)}
                  className="tap-target rounded-md border-2 border-cookie-brown px-4 text-sm font-semibold text-cookie-brown"
                >
                  Edit Product
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {feedback ? (
        <p className="mt-4 text-sm font-semibold text-cookie-brown">{feedback}</p>
      ) : null}
    </main>
  );
}
