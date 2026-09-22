import type { Metadata } from "next";
import { Bangers, Inter } from "next/font/google";
import Script from "next/script";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { SPLASH_DISMISSED_STORAGE_KEY } from "@/components/features/IntroLanding";
import { siteUrl } from "@/config/site";
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
  return (
    <html lang="en">
      <body className={`${inter.variable} ${bangers.variable} antialiased`}>
        {/* Runs before hydration/paint (beforeInteractive) so a returning
            visitor never sees a flash of the splash gate: reads the
            client-only dismissal flag directly and flags <html> for the
            CSS override in globals.css. Keeps "/" fully static - no
            server-side cookie read gating it into dynamic rendering. */}
        <Script id="splash-precheck" strategy="beforeInteractive">
          {`
            try {
              if (localStorage.getItem("${SPLASH_DISMISSED_STORAGE_KEY}") === "true") {
                document.documentElement.setAttribute("data-splash-seen", "true");
              }
            } catch (e) {}
          `}
        </Script>
        <a
          href="#main-content"
          className="sr-only z-[100] rounded-md border-2 border-cookie-brown bg-hero-yellow px-4 py-2 font-semibold text-cookie-brown-dark focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to main content
        </a>
        <div className="min-h-screen bg-flour-white">
          <Header />
          <div id="main-content">{children}</div>
          <Footer />
        </div>
      </body>
    </html>
  );
}
