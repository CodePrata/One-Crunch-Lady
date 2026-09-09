import type { Metadata } from "next";
import { InstagramLogo, TiktokLogo } from "@phosphor-icons/react/dist/ssr";
import { Analytics } from "@vercel/analytics/react";
import { Bangers, Inter } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const bangers = Bangers({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bangers",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const description = "Crunchy, comic-style cookies built with love.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "One Crunch Lady",
    template: "%s | One Crunch Lady",
  },
  description,
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/icon.png",
  },
  openGraph: {
    title: "One Crunch Lady",
    description,
    url: siteUrl,
    siteName: "One Crunch Lady",
    images: ["/ocl_logo-nobg.png"],
    locale: "en_SG",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "One Crunch Lady",
    description,
    images: ["/ocl_logo-nobg.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  const whatsappHref = whatsappNumber ? `https://wa.me/${whatsappNumber}` : null;
  // Icons always render; an unconfigured deploy falls back to the
  // platform homepage rather than hiding the icon outright.
  const instagramHref = process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://www.instagram.com";
  const tiktokHref = process.env.NEXT_PUBLIC_TIKTOK_URL || "https://www.tiktok.com";

  return (
    <html lang="en">
      <body className={`${inter.variable} ${bangers.variable} antialiased`}>
        <a
          href="#main-content"
          className="sr-only z-[100] rounded-md border-2 border-cookie-brown bg-hero-yellow px-4 py-2 font-semibold text-cookie-brown-dark focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to main content
        </a>
        <div className="min-h-screen bg-flour-white">
          <header className="z-header sticky top-0 border-b-[3px] border-cookie-brown bg-flour-white">
            <div className="responsive-shell flex items-center px-4 py-2.5 tablet:px-6 desktop:px-8">
              <Link
                href="/"
                className="tap-target inline-flex items-center gap-2"
                aria-label="One Crunch Lady home"
              >
                <Image
                  src="/ocl_logo-nobg.png" // Path relative to the public folder
                  alt=""
                  width={56}
                  height={56}
                  className="h-14 w-14 object-contain"
                  priority
                />
                <span className="font-display text-2xl uppercase leading-none text-cookie-brown-dark">
                  One Crunch Lady
                </span>
              </Link>
            </div>
          </header>

          <div id="main-content">{children}</div>

          <footer className="mt-12 border-t-[3px] border-cookie-brown bg-cookie-brown/10">
            <div className="responsive-shell grid gap-4 px-4 py-8 tablet:px-6 desktop:grid-cols-2 desktop:px-8">
              <div>
                <p className="font-display text-3xl uppercase text-cookie-brown-dark">One Crunch Lady</p>
                <p className="mt-2 text-base text-cookie-brown-dark">
                  Comic-crunch cookies with bold flavor and heart.
                </p>
              </div>
              <div className="flex flex-col gap-1 text-cookie-brown-dark desktop:items-end">
                <div className="flex items-center gap-3">
                  <a
                    href={instagramHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="One Crunch Lady on Instagram"
                    className="tap-target inline-flex items-center justify-center rounded-full border-2 border-cookie-brown text-cookie-brown-dark transition hover:bg-flour-white"
                  >
                    <InstagramLogo size={22} weight="bold" aria-hidden="true" />
                  </a>
                  <a
                    href={tiktokHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="One Crunch Lady on TikTok"
                    className="tap-target inline-flex items-center justify-center rounded-full border-2 border-cookie-brown text-cookie-brown-dark transition hover:bg-flour-white"
                  >
                    <TiktokLogo size={22} weight="bold" aria-hidden="true" />
                  </a>
                </div>
                {whatsappHref ? (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tap-target inline-flex items-center text-base font-semibold"
                  >
                    WhatsApp Us
                  </a>
                ) : null}
                <Link href="/privacy" className="tap-target inline-flex items-center text-sm">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="tap-target inline-flex items-center text-sm">
                  Terms & Conditions
                </Link>
                <Link href="/refund" className="tap-target inline-flex items-center text-sm">
                  Refund & Cancellation Policy
                </Link>
              </div>
            </div>
          </footer>
        </div>
        <Analytics />
      </body>
    </html>
  );
}
