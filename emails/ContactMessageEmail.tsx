import { Heading, Text } from "@react-email/components";
import BaseLayout from "@/emails/BaseLayout";

interface ContactMessageEmailProps {
  customerEmail: string;
  message: string;
  whatsappNumber: string;
}

export default function ContactMessageEmail({
  customerEmail,
  message,
  whatsappNumber,
}: ContactMessageEmailProps) {
  return (
    <BaseLayout
      previewText={`New contact message from ${customerEmail}`}
      whatsappNumber={whatsappNumber}
    >
      <Heading as="h1">New Contact Message</Heading>
      <Text>
        From: <strong>{customerEmail}</strong>
      </Text>
      {/* whiteSpace: pre-line so paragraph breaks in the customer's
          message survive - HTML collapses plain newlines otherwise. */}
      <Text style={{ whiteSpace: "pre-line" }}>{message}</Text>
    </BaseLayout>
  );
}
