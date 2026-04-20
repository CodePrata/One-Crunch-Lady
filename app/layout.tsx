import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { Bangers, Inter } from "next/font/google";
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
  return (
    <html lang="en">
      <body className={`${inter.variable} ${bangers.variable} antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
