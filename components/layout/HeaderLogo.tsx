import Image from "next/image";
import type { BrandImage } from "@/types/models";

// Largest rendered height of each piece (desktop:h-28 / desktop:h-16).
// Passed as next/image's height, with the width scaled from the image's
// real aspect ratio, so the loader's srcset requests a header-sized
// Cloudinary rendition rather than the full upload.
const MASCOT_MAX_HEIGHT = 112;
const WORDMARK_MAX_HEIGHT = 64;

function scaledWidth(image: BrandImage, height: number): number {
  return Math.max(1, Math.round((height * image.width) / image.height));
}

/**
 * The mascot half of the header logo lockup. The max-w caps keep an
 * unusually wide admin upload from pushing the inline nav out (the
 * default mascot is ~56-78px wide, well under them).
 *
 * alt="": the surrounding home link's aria-label names it.
 */
export function HeaderMascot({ image }: { image: BrandImage }) {
  return (
    <Image
      src={image.url}
      alt=""
      width={scaledWidth(image, MASCOT_MAX_HEIGHT)}
      height={MASCOT_MAX_HEIGHT}
      // Local /public default: the custom Cloudinary loader
      // (lib/cloudinary-loader.ts) passes "/" paths through unchanged at
      // any requested width, which is correct but makes Next warn that the
      // loader "does not implement width". unoptimized reflects reality
      // there - one fixed URL - and silences the warning. Admin uploads
      // (Cloudinary URLs) do go through the loader, resized per width.
      unoptimized={image.url.startsWith("/")}
      className="h-20 w-auto max-w-[80px] shrink-0 object-contain tablet:h-24 tablet:max-w-[100px] desktop:h-28 desktop:max-w-[120px]"
      priority
    />
  );
}

/**
 * The wordmark half: an admin-uploaded image when set, otherwise the
 * built-in Bangers text. Size caps fit the space the text takes at each
 * breakpoint (measured: 61px spare at 375px, 132px at 1024px). min-w-0
 * also lets a very wide upload shrink (object-contain keeps its ratio) to
 * whatever room is left on the narrowest phones, instead of running into
 * the hamburger button - the home link in Header.tsx is min-w-0 for this.
 */
export function HeaderWordmark({ image }: { image: BrandImage | null }) {
  if (image) {
    return (
      <Image
        src={image.url}
        alt=""
        width={scaledWidth(image, WORDMARK_MAX_HEIGHT)}
        height={WORDMARK_MAX_HEIGHT}
        className="h-8 w-auto min-w-0 max-w-[180px] object-contain mobile:h-10 mobile:max-w-[200px] tablet:h-12 tablet:max-w-[240px] desktop:h-16 desktop:max-w-[340px]"
        priority
      />
    );
  }

  return (
    <span className="whitespace-nowrap font-display text-2xl uppercase leading-none text-cookie-brown-dark mobile:text-3xl tablet:text-4xl desktop:text-5xl">
      One Crunch Lady
    </span>
  );
}
