import {
  fetchBanners,
  fetchFaqItems,
  fetchOrders,
  fetchProducts,
  fetchPromoCodes,
} from "@/app/actions/admin";
import AdminOrdersClient from "@/components/features/AdminOrdersClient";

export default async function AdminOrdersPage() {
  const [orders, products, banners, promoCodes, faqItems] = await Promise.all([
    fetchOrders(),
    fetchProducts(),
    fetchBanners(),
    fetchPromoCodes(),
    fetchFaqItems(),
  ]);
  return (
    <AdminOrdersClient
      initialOrders={orders}
      initialProducts={products}
      initialBanners={banners}
      initialPromoCodes={promoCodes}
      initialFaqItems={faqItems}
    />
  );
}
