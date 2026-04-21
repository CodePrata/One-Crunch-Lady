import type { Metadata } from "next";
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
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}`
    : "https://wa.me/";

  return (
    <html lang="en">
      <body className={`${inter.variable} ${bangers.variable} antialiased`}>
        <div className="min-h-screen bg-flour-white">
          <header className="sticky top-0 z-50 border-b-[3px] border-cookie-brown bg-flour-white">
            <div className="responsive-shell flex items-center justify-between px-4 py-3 tablet:px-6 desktop:px-8">
            <Link
              href="/"
              className="tap-target inline-flex items-center"
              aria-label="One Crunch Lady home"
            >
              <Image
                src="/ocl_logo-nobg.png" // Path relative to the public folder
                alt="One Crunch Lady Logo"
                width={120}
                height={60}
                className="h-auto w-auto object-contain"
                priority
              />
            </Link>
              <a
                href="/#order-form"
                className="tap-target inline-flex items-center justify-center rounded-lg border-[3px] border-cookie-brown bg-power-red px-4 font-semibold text-flour-white transition hover:brightness-95"
              >
                Order Now
              </a>
            </div>
          </header>

          {children}

          <footer className="mt-16 border-t-[3px] border-cookie-brown bg-flour-white">
            <div className="responsive-shell grid gap-4 px-4 py-10 tablet:px-6 desktop:grid-cols-2 desktop:px-8">
              <div>
                <p className="font-display text-3xl uppercase text-cookie-brown">
                  One Crunch Lady
                </p>
                <p className="mt-2 text-base text-cookie-brown">
                  Comic-crunch cookies with bold flavor and heart.
                </p>
              </div>
              <div className="flex flex-col text-cookie-brown desktop:items-end">
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tap-target inline-flex items-center text-base font-semibold "
                >
                  WhatsApp Us
                </a>
                <Link
                  href="/privacy"
                  className="tap-target -mt-2 inline-flex items-center text-sm"
                >
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
