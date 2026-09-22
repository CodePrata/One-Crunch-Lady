"use client";

import { List, ShoppingCart, X } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useCartHasHydrated, useCartStore } from "@/lib/store/cart";

const NAV_LINKS = [
  { href: "/story", label: "Our Story" },
  { href: "/promotion", label: "Promotion" },
  { href: "/products", label: "Products" },
  { href: "/contact", label: "Contact Us" },
  { href: "/faq", label: "FAQ" },
];

/**
 * Site header: image logo lockup + primary nav. Six nav items (five text
 * links plus Cart) don't fit inline below `desktop:` (1280px) - mobile
 * and tablet get a hamburger panel, matching the focus-trap + scroll-lock
 * pattern the cart drawer and product modal already use (see
 * hooks/useFocusTrap.ts, hooks/useBodyScrollLock.ts) rather than a new one.
 *
 * Client Component (menu state, live cart count) - app/layout.tsx around
 * it stays a Server Component.
 */
export default function Header() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const hasHydrated = useCartHasHydrated();
  // Header lives in the ROOT layout (every route, including /admin and
  // /privacy - none of which are wrapped by CartCatalogProvider, which is
  // scoped to app/(storefront)/layout.tsx). Reading raw persisted items
  // straight from the store - rather than useCartCatalogItems(), which
  // requires that provider - keeps the badge count correct everywhere
  // without depending on catalog context this component doesn't have.
  // A simple count doesn't need the price/availability join anyway.
  const items = useCartStore((state) => state.items);
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  // Gate the badge on hydration so the server-rendered pass and the first
  // client paint agree on "no badge" - mirrors CartBubble.
  const showBadge = hasHydrated && itemCount > 0;
  const cartLabel = showBadge ? `Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}` : "Cart";

  useBodyScrollLock(isMenuOpen);
  useFocusTrap(panelRef, isMenuOpen);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    panelRef.current?.focus();
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]);

  // Route changes don't unmount this component (it lives in the layout),
  // so a nav click needs to close the panel itself.
  function closeMenu() {
    setIsMenuOpen(false);
  }

  function isActive(href: string): boolean {
    return pathname === href;
  }

  return (
    <>
      {/*
        bg-[#EFECEB] is the flattened, OPAQUE equivalent of the footer's
        bg-cookie-brown/10 (cookie-brown #8D6E63 at 10% over flour-white
        #FAFAFA) - same visual tint, matching the client's "same colour as
        the footer" ask. The footer can use the translucent utility
        directly because nothing scrolls under it; this header is
        `sticky`, so an actually-translucent background lets page content
        bleed through as you scroll ("see-through") instead of reading as
        a solid color the way it does on the static footer.
      */}
      <header className="z-header sticky top-0 border-b-[3px] border-cookie-brown bg-[#EFECEB]">
        <div className="responsive-shell flex items-center justify-between gap-3 px-4 py-1.5 tablet:px-6 desktop:px-8">
          <Link
            href="/"
            className="tap-target inline-flex items-center gap-2"
            aria-label="One Crunch Lady home"
            onClick={closeMenu}
          >
            {/* unoptimized: these are local /public assets - the custom
                Cloudinary loader (lib/cloudinary-loader.ts) passes any
                "/"-prefixed src through unchanged regardless of the
                requested width, which is correct (never round-trip a
                local asset through Cloudinary) but is exactly what makes
                Next.js's responsive-width heuristic warn that the loader
                "does not implement width". unoptimized reflects reality -
                a single fixed-size URL, no width-variant srcset - and
                suppresses the (accurate, but not actionable here) warning. */}
            <Image
              src="/header-logo.png"
              alt=""
              width={285}
              height={408}
              unoptimized
              className="h-20 w-auto object-contain tablet:h-24 desktop:h-28"
              priority
            />
            <Image
              src="/header-title.png"
              alt="One Crunch Lady"
              width={612}
              height={408}
              unoptimized
              className="h-16 w-auto object-contain tablet:h-20 desktop:h-24"
              priority
            />
          </Link>

          {/* Inline nav - only shown at desktop: (1280px) and up */}
          <nav aria-label="Primary" className="hidden items-center gap-6 desktop:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={`tap-target inline-flex items-center text-base font-semibold text-cookie-brown-dark transition hover:text-power-red ${
                  isActive(link.href)
                    ? "underline decoration-power-red decoration-[3px] underline-offset-4"
                    : ""
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/cart"
              aria-label={cartLabel}
              aria-current={isActive("/cart") ? "page" : undefined}
              className="tap-target relative inline-flex items-center gap-1.5 rounded-md border-2 border-cookie-brown px-3 text-base font-semibold text-cookie-brown-dark transition hover:text-power-red"
            >
              <ShoppingCart size={20} weight="bold" aria-hidden="true" />
              Cart
              {showBadge ? (
                <span
                  aria-hidden="true"
                  className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-power-red px-1 text-xs font-bold text-flour-white"
                >
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              ) : null}
            </Link>
          </nav>

          {/* Hamburger trigger - hidden at desktop: and up */}
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav-panel"
            aria-label="Open menu"
            className="tap-target inline-flex items-center justify-center rounded-md border-2 border-cookie-brown text-cookie-brown-dark desktop:hidden"
          >
            <List size={24} weight="bold" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Rendered as a sibling of <header>, not nested inside it: <header>
          establishes its own stacking context at z-header (40), which
          would otherwise cap any z-index given to a descendant - trapping
          this overlay below the floating cart bubble (z-cart-bubble, 45)
          no matter what value it's given. As a top-level sibling, z-modal
          compares correctly against the rest of the named scale. */}
      {isMenuOpen ? (
        <div className="z-modal fixed inset-0 desktop:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={closeMenu}
            className="absolute inset-0 bg-cookie-brown/50"
          />
          <div
            id="mobile-nav-panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Primary"
            tabIndex={-1}
            className="absolute right-0 top-0 flex h-full w-full max-w-xs flex-col gap-1 border-l-[3px] border-cookie-brown bg-flour-white p-5 outline-none"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-display text-2xl uppercase text-cookie-brown-dark">Menu</span>
              <button
                type="button"
                onClick={closeMenu}
                aria-label="Close menu"
                className="tap-target inline-flex items-center justify-center rounded-md border-2 border-cookie-brown text-cookie-brown-dark"
              >
                <X size={22} weight="bold" aria-hidden="true" />
              </button>
            </div>

            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={`tap-target flex items-center rounded-md px-2 text-lg font-semibold text-cookie-brown-dark transition hover:text-power-red ${
                  isActive(link.href) ? "bg-hero-yellow/40" : ""
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/cart"
              onClick={closeMenu}
              aria-current={isActive("/cart") ? "page" : undefined}
              className={`tap-target flex items-center gap-2 rounded-md px-2 text-lg font-semibold text-cookie-brown-dark transition hover:text-power-red ${
                isActive("/cart") ? "bg-hero-yellow/40" : ""
              }`}
            >
              <ShoppingCart size={20} weight="bold" aria-hidden="true" />
              Cart
              {showBadge ? (
                <span
                  aria-hidden="true"
                  className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-power-red px-1 text-xs font-bold text-flour-white"
                >
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              ) : null}
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
