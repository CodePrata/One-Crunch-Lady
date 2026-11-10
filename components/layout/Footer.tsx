import { InstagramLogo, TiktokLogo } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";
import { instagramUrl, tiktokUrl } from "@/config/site";

/**
 * Server Component - no client state needed here. Reads social links from
 * config/site.ts (the single source of truth for public config) rather
 * than process.env directly.
 */
export default function Footer() {
  return (
    <footer className="mt-12 border-t-[3px] border-cookie-brown bg-cookie-brown/10">
      {/* pb-24 (96px): clearance for the fixed CartBubble (bottom-5 + h-14
          + badge = ~82px up from the viewport bottom), so the last row of
          links isn't covered when scrolled to the very end of the page. */}
      <div className="responsive-shell grid gap-4 px-4 pb-24 pt-8 tablet:px-6 desktop:grid-cols-2 desktop:px-8">
        <div>
          {/* Splash badge (public/ocl_logo-nobg.png) cropped to its visible
              circle. unoptimized: local /public asset - see Header.tsx. */}
          <Image
            src="/footer-logo.png"
            alt="One Crunch Lady"
            width={327}
            height={308}
            unoptimized
            className="h-32 w-auto object-contain tablet:h-36"
          />
          <p className="mt-2 text-base text-cookie-brown-dark">
            Comic-crunch cookies with bold flavor and heart.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-cookie-brown-dark desktop:items-end">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold uppercase tracking-wide text-cookie-brown-dark">
              Follow us on
            </span>
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="One Crunch Lady on Instagram"
              className="tap-target inline-flex items-center justify-center rounded-full border-2 border-cookie-brown text-cookie-brown-dark transition hover:bg-flour-white"
            >
              <InstagramLogo size={22} weight="bold" aria-hidden="true" />
            </a>
            <a
              href={tiktokUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="One Crunch Lady on TikTok"
              className="tap-target inline-flex items-center justify-center rounded-full border-2 border-cookie-brown text-cookie-brown-dark transition hover:bg-flour-white"
            >
              <TiktokLogo size={22} weight="bold" aria-hidden="true" />
            </a>
          </div>
          <div className="flex flex-col gap-1 desktop:items-end">
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
      </div>
    </footer>
  );
}
