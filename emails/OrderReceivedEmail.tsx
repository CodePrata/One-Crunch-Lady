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
  /** Pre-discount total and the code that produced discountAmount - both omitted (undefined) when no promo code was applied, in which case only Total renders, unchanged from before promo codes existed. */
  subtotal?: number;
  discountAmount?: number;
  promoCode?: string | null;
  paynowNumber: string;
  whatsappNumber: string;
}

export default function OrderReceivedEmail({
  orderRef,
  items,
  totalPrice,
  subtotal,
  discountAmount,
  promoCode,
  paynowNumber,
  whatsappNumber,
}: OrderReceivedEmailProps) {
  const hasDiscount = Boolean(promoCode && discountAmount && discountAmount > 0);

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
      {hasDiscount ? (
        <>
          <Text>Subtotal: ${(subtotal ?? totalPrice).toFixed(2)}</Text>
          <Text>
            Discount ({promoCode}): -${(discountAmount ?? 0).toFixed(2)}
          </Text>
        </>
      ) : null}
      <Text style={{ fontWeight: "700" }}>Total: ${totalPrice.toFixed(2)}</Text>
      <Text>
        Please PayNow to <strong>{paynowNumber}</strong> and share your payment
        proof on WhatsApp.
      </Text>
    </BaseLayout>
  );
}
