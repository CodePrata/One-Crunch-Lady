import { Heading, Hr, Section, Text } from "@react-email/components";
import BaseLayout from "@/emails/BaseLayout";

interface OrderItem {
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface OrderReceivedEmailProps {
  orderRef: string;
  items: OrderItem[];
  totalPrice: number;
  paynowNumber: string;
  whatsappNumber: string;
}

export default function OrderReceivedEmail({
  orderRef,
  items,
  totalPrice,
  paynowNumber,
  whatsappNumber,
}: OrderReceivedEmailProps) {
  return (
    <BaseLayout
      previewText={`Order #${orderRef} received`}
      whatsappNumber={whatsappNumber}
      whatsappMessage={`Hi One Crunch Lady, here is my payment proof for Order #${orderRef}!`}
    >
      <Heading as="h1">Order Received!</Heading>
      <Text>We&apos;ve got your order #{orderRef}.</Text>

      <Section style={{ marginTop: "16px" }}>
        {items.map((item) => (
          <Text key={`${item.productName}-${item.quantity}`}>
            {item.productName} x {item.quantity} - $
            {(item.unitPrice * item.quantity).toFixed(2)}
          </Text>
        ))}
      </Section>

      <Hr />
      <Text style={{ fontWeight: "700" }}>Total: ${totalPrice.toFixed(2)}</Text>
      <Text>
        Please PayNow to <strong>{paynowNumber}</strong> and share your payment
        proof on WhatsApp.
      </Text>
    </BaseLayout>
  );
}
