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

export const metadata: Metadata = {
  title: "One Crunch Lady",
  description: "Crunchy, comic-style cookies built with love.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  const whatsappHref = whatsappNumber ? `https://wa.me/${whatsappNumber}` : "https://wa.me/";
  // Falls back to the platform's own homepage (same pattern as
  // whatsappHref above) so the icons always render - including in local
  // dev, where these are typically unset - rather than silently
  // disappearing whenever the specific handle hasn't been configured.
  const instagramHref = process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://www.instagram.com/";
  const tiktokHref = process.env.NEXT_PUBLIC_TIKTOK_URL || "https://www.tiktok.com/";

  return (
    <html lang="en">
      <body className={`${inter.variable} ${bangers.variable} antialiased`}>
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
                  width={40}
                  height={40}
                  className="h-10 w-10 object-contain"
                  priority
                />
                <span className="font-display text-2xl uppercase leading-none text-cookie-brown">
                  One Crunch Lady
                </span>
              </Link>
            </div>
          </header>

          {children}

          <footer className="mt-16 border-t-[3px] border-cookie-brown bg-cookie-brown/10">
            <div className="responsive-shell grid gap-6 px-4 py-10 tablet:px-6 desktop:grid-cols-2 desktop:px-8">
              <div>
                <p className="font-display text-3xl uppercase text-cookie-brown">One Crunch Lady</p>
                <p className="mt-2 text-base text-cookie-brown">
                  Comic-crunch cookies with bold flavor and heart.
                </p>
              </div>
              <div className="flex flex-col gap-3 text-cookie-brown desktop:items-end">
                <div className="flex items-center gap-3">
                  <a
                    href={instagramHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="One Crunch Lady on Instagram"
                    className="tap-target inline-flex items-center justify-center rounded-full border-2 border-cookie-brown text-cookie-brown transition hover:bg-flour-white"
                  >
                    <InstagramLogo size={22} weight="bold" aria-hidden="true" />
                  </a>
                  <a
                    href={tiktokHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="One Crunch Lady on TikTok"
                    className="tap-target inline-flex items-center justify-center rounded-full border-2 border-cookie-brown text-cookie-brown transition hover:bg-flour-white"
                  >
                    <TiktokLogo size={22} weight="bold" aria-hidden="true" />
                  </a>
                </div>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tap-target inline-flex items-center text-base font-semibold"
                >
                  WhatsApp Us
                </a>
                <Link href="/privacy" className="tap-target inline-flex items-center text-sm">
                  Privacy Policy
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
