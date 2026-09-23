import { fetchBanners, fetchOrders, fetchProducts, fetchPromoCodes } from "@/app/actions/admin";
import AdminOrdersClient from "@/components/features/AdminOrdersClient";

export default async function AdminOrdersPage() {
  const [orders, products, banners, promoCodes] = await Promise.all([
    fetchOrders(),
    fetchProducts(),
    fetchBanners(),
    fetchPromoCodes(),
  ]);
  return (
    <AdminOrdersClient
      initialOrders={orders}
      initialProducts={products}
      initialBanners={banners}
      initialPromoCodes={promoCodes}
    />
  );
}
