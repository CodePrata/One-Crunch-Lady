import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

interface BaseLayoutProps {
  previewText: string;
  whatsappNumber: string;
  whatsappMessage?: string;
  children: ReactNode;
}

export default function BaseLayout({
  previewText,
  whatsappNumber,
  whatsappMessage,
  children,
}: BaseLayoutProps) {
  const safeWhatsappNumber = whatsappNumber || "";
  const encodedMessage = whatsappMessage
    ? `?text=${encodeURIComponent(whatsappMessage)}`
    : "";
  const whatsappHref = `https://wa.me/${safeWhatsappNumber}${encodedMessage}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={headerStyle}>
            <Img src="/logo.png" alt="One Crunch Lady logo" width="120" />
          </Section>

          <Section style={contentStyle}>{children}</Section>

          <Section style={footerStyle}>
            <Text style={signatureStyle}>Baked with Mom Strength</Text>
            <Button href={whatsappHref} style={buttonStyle}>
              WhatsApp One Crunch Lady
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle = {
  backgroundColor: "#000000",
  fontFamily: "Arial, sans-serif",
  margin: 0,
  padding: "24px 0",
};

const containerStyle = {
  backgroundColor: "#FFFFFF",
  border: "2px solid #000000",
  margin: "0 auto",
  maxWidth: "600px",
};

const headerStyle = {
  backgroundColor: "#D32F2F",
  padding: "20px",
  textAlign: "center" as const,
};

const contentStyle = {
  color: "#000000",
  padding: "24px",
};

const footerStyle = {
  borderTop: "2px solid #000000",
  padding: "20px 24px",
  textAlign: "center" as const,
};

const signatureStyle = {
  fontSize: "14px",
  fontWeight: "700",
  marginBottom: "14px",
};

const buttonStyle = {
  backgroundColor: "#D32F2F",
  border: "2px solid #000000",
  color: "#FFFFFF",
  fontWeight: "700",
  padding: "10px 16px",
  textDecoration: "none",
};
