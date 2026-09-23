import { fetchBanners, fetchOrders, fetchProducts } from "@/app/actions/admin";
import AdminOrdersClient from "@/components/features/AdminOrdersClient";

export default async function AdminOrdersPage() {
  const [orders, products, banners] = await Promise.all([
    fetchOrders(),
    fetchProducts(),
    fetchBanners(),
  ]);
  return <AdminOrdersClient initialOrders={orders} initialProducts={products} initialBanners={banners} />;
}
