import { Heading, Hr, Link, Section, Text } from "@react-email/components";
import BaseLayout from "@/emails/BaseLayout";

interface OrderItem {
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface OwnerAlertEmailProps {
  orderRef: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: OrderItem[];
  totalPrice: number;
  adminDashboardUrl: string;
  whatsappNumber: string;
}

export default function OwnerAlertEmail({
  orderRef,
  customerName,
  customerEmail,
  customerPhone,
  items,
  totalPrice,
  adminDashboardUrl,
  whatsappNumber,
}: OwnerAlertEmailProps) {
  return (
    <BaseLayout
      previewText={`New order alert #${orderRef}`}
      whatsappNumber={whatsappNumber}
      whatsappMessage={`New order ${orderRef} received.`}
    >
      <Heading as="h1">New Order Alert</Heading>
      <Text>
        <strong>Order Ref:</strong> {orderRef}
      </Text>
      <Text>
        <strong>Name:</strong> {customerName}
      </Text>
      <Text>
        <strong>Email:</strong> {customerEmail}
      </Text>
      <Text>
        <strong>Phone:</strong> {customerPhone}
      </Text>

      <Section style={{ marginTop: "16px" }}>
        {items.map((item) => (
          <Text key={`${item.productName}-${item.quantity}`}>
            {item.productName} x {item.quantity} - $
            {(item.unitPrice * item.quantity).toFixed(2)}
          </Text>
        ))}
      </Section>

      <Hr />
      <Text style={{ fontWeight: "700" }}>
        Total Amount Payable: ${totalPrice.toFixed(2)}
      </Text>
      <Text>
        Open admin dashboard: <Link href={adminDashboardUrl}>Manage order</Link>
      </Text>
    </BaseLayout>
  );
}
