import { Heading, Text } from "@react-email/components";
import BaseLayout from "@/emails/BaseLayout";

interface PaymentConfirmedEmailProps {
  orderRef: string;
  customerName: string;
  whatsappNumber: string;
}

export default function PaymentConfirmedEmail({
  orderRef,
  customerName,
  whatsappNumber,
}: PaymentConfirmedEmailProps) {
  return (
    <BaseLayout
      previewText={`Payment received for order #${orderRef}`}
      whatsappNumber={whatsappNumber}
      whatsappMessage={`Hi One Crunch Lady, thanks for confirming payment on Order #${orderRef}.`}
    >
      <Heading as="h1">Payment Received, We&apos;re Baking!</Heading>
      <Text>Hi {customerName},</Text>
      <Text>
        Your payment for order #{orderRef} is confirmed. The mission has started
        and your batch is now entering the oven.
      </Text>
    </BaseLayout>
  );
}
