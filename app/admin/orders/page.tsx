import {
  fetchOrders,
  fetchProducts,
} from "@/app/actions/admin";
import AdminOrdersClient from "@/components/features/AdminOrdersClient";

export default async function AdminOrdersPage() {
  const [orders, products] = await Promise.all([fetchOrders(), fetchProducts()]);
  return <AdminOrdersClient initialOrders={orders} initialProducts={products} />;
}
