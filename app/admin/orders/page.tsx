import {
  createProduct,
  fetchOrders,
  fetchProducts,
  toggleProductAvailability,
  updateOrderStatus,
} from "@/app/actions/admin";

function formatPrice(value: number) {
  return `$${Number(value).toFixed(2)}`;
}

export default async function AdminOrdersPage() {
  const [orders, products] = await Promise.all([fetchOrders(), fetchProducts()]);

  async function createProductFromForm(formData: FormData) {
    "use server";

    const name = String(formData.get("name") ?? "");
    const description = String(formData.get("description") ?? "");
    const price = Number(formData.get("price") ?? 0);
    const image_url = String(formData.get("image_url") ?? "");
    const ingredients = String(formData.get("ingredients") ?? "");

    await createProduct({
      name,
      description,
      price,
      image_url,
      ingredients,
    });
  }

  return (
    <main className="responsive-shell px-4 py-10 tablet:px-6 desktop:px-8">
      <section className="mb-8 rounded-2xl border-[3px] border-cookie-brown bg-flour-white p-6">
        <details>
          <summary className="tap-target inline-flex cursor-pointer items-center justify-center rounded-md border-[3px] border-cookie-brown bg-power-red px-5 font-bold text-flour-white">
            Add New Product
          </summary>

          <form action={createProductFromForm} className="mt-5 grid gap-3">
            <div>
              <label
                htmlFor="name"
                className="mb-1 block text-sm font-semibold text-cookie-brown"
              >
                Name
              </label>
              <input
                id="name"
                name="name"
                required
                className="tap-target w-full rounded-md border-2 border-cookie-brown px-3 text-cookie-brown"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-1 block text-sm font-semibold text-cookie-brown"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                required
                className="w-full rounded-md border-2 border-cookie-brown px-3 py-2 text-cookie-brown"
                rows={3}
              />
            </div>

            <div className="grid gap-3 tablet:grid-cols-2">
              <div>
                <label
                  htmlFor="price"
                  className="mb-1 block text-sm font-semibold text-cookie-brown"
                >
                  Price
                </label>
                <input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  className="tap-target w-full rounded-md border-2 border-cookie-brown px-3 text-cookie-brown"
                />
              </div>

              <div>
                <label
                  htmlFor="ingredients"
                  className="mb-1 block text-sm font-semibold text-cookie-brown"
                >
                  Ingredients
                </label>
                <input
                  id="ingredients"
                  name="ingredients"
                  required
                  className="tap-target w-full rounded-md border-2 border-cookie-brown px-3 text-cookie-brown"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="image_url"
                className="mb-1 block text-sm font-semibold text-cookie-brown"
              >
                Image URL (Cloudinary)
              </label>
              <input
                id="image_url"
                name="image_url"
                className="tap-target w-full rounded-md border-2 border-cookie-brown px-3 text-cookie-brown"
                placeholder="https://res.cloudinary.com/..."
              />
            </div>

            <button
              type="submit"
              className="tap-target inline-flex items-center justify-center rounded-md border-2 border-cookie-brown bg-hero-yellow px-4 font-semibold text-cookie-brown"
            >
              Create Product
            </button>
          </form>
        </details>
      </section>

      <section className="rounded-2xl border-[3px] border-cookie-brown bg-flour-white p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-5xl uppercase text-cookie-brown">
            Admin Orders
          </h1>
          <a
            href="/admin/orders"
            className="tap-target inline-flex items-center justify-center rounded-md border-2 border-cookie-brown px-4 font-semibold text-cookie-brown"
          >
            Refresh
          </a>
        </div>

        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="rounded-lg border-2 border-cookie-brown p-4 text-cookie-brown">
              No orders yet.
            </div>
          ) : (
            orders.map((order) => (
              <article
                key={order.id}
                className="rounded-lg border-2 border-cookie-brown p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-3xl uppercase text-cookie-brown">
                      {order.order_ref}
                    </p>
                    <p className="text-sm text-cookie-brown">
                      {order.customer_name}
                    </p>
                    <p className="text-sm font-semibold text-cookie-brown">
                      {formatPrice(order.total_price)}
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-cookie-brown">
                      Status: {order.status}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={updateOrderStatus.bind(null, order.id, "PAID")}>
                      <button
                        type="submit"
                        className="tap-target rounded-md border-2 border-cookie-brown bg-hero-yellow px-4 text-sm font-semibold text-cookie-brown"
                        disabled={order.status === "PAID" || order.status === "READY"}
                      >
                        Mark as Paid
                      </button>
                    </form>
                    <form action={updateOrderStatus.bind(null, order.id, "READY")}>
                      <button
                        type="submit"
                        className="tap-target rounded-md border-[3px] border-cookie-brown bg-power-red px-4 text-sm font-semibold text-flour-white"
                        disabled={order.status === "READY"}
                      >
                        Mark as Ready
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border-[3px] border-cookie-brown bg-flour-white p-6">
        <h2 className="font-display text-4xl uppercase text-cookie-brown">
          Product Availability
        </h2>

        <div className="mt-4 space-y-2">
          {products.map((product) => (
            <div
              key={product.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-cookie-brown p-3"
            >
              <p className="font-semibold text-cookie-brown">{product.name}</p>
              <form
                action={toggleProductAvailability.bind(
                  null,
                  product.id,
                  !product.is_available
                )}
              >
                <button
                  type="submit"
                  className={`tap-target rounded-md border-2 border-cookie-brown px-4 text-sm font-semibold ${
                    product.is_available
                      ? "bg-hero-yellow text-cookie-brown"
                      : "bg-cookie-brown text-flour-white"
                  }`}
                >
                  {product.is_available ? "Deactivate" : "Activate"}
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
