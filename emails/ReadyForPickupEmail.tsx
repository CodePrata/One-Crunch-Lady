import { Heading, Text } from "@react-email/components";
import BaseLayout from "@/emails/BaseLayout";

interface ReadyForPickupEmailProps {
  orderRef: string;
  customerName: string;
  pickupHours: string;
  whatsappNumber: string;
}

export default function ReadyForPickupEmail({
  orderRef,
  customerName,
  pickupHours,
  whatsappNumber,
}: ReadyForPickupEmailProps) {
  return (
    <BaseLayout
      previewText={`Order #${orderRef} is ready for pickup`}
      whatsappNumber={whatsappNumber}
      whatsappMessage={`Hi One Crunch Lady, I am coordinating pickup for Order #${orderRef}.`}
    >
      <Heading as="h1">Ready for Pickup!</Heading>
      <Text>Hi {customerName},</Text>
      <Text>
        Order #{orderRef} is ready. Pickup hours: <strong>{pickupHours}</strong>.
      </Text>
      <Text>
        Please message us on WhatsApp before arriving so we can prepare your
        handoff.
      </Text>
    </BaseLayout>
  );
}
