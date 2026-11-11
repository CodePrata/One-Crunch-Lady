"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resetHeaderImage, setHeaderImage } from "@/app/actions/admin";
import { assertOk } from "@/lib/admin-client";
import type { AdminBranding } from "@/types/admin";
import CloudinaryImageField from "@/components/features/admin/CloudinaryImageField";
import { HeaderMascot, HeaderWordmark } from "@/components/layout/HeaderLogo";
import { defaultHeaderMascot } from "@/config/site";
import type { BrandingSlot } from "@/lib/validations/branding";
import type { BrandImage } from "@/types/models";

interface ImageDraft {
  url: string;
  width: number | null;
  height: number | null;
}

const EMPTY_DRAFT: ImageDraft = { url: "", width: null, height: null };

function toBrandImage(
  url: string | null,
  width: number | null,
  height: number | null
): BrandImage | null {
  return url && width && height ? { url, width, height } : null;
}

function draftToImage(draft: ImageDraft): BrandImage | null {
  return toBrandImage(draft.url || null, draft.width, draft.height);
}

const SLOT_COPY: Record<
  BrandingSlot,
  { title: string; help: string; upload: string; reset: string; resetConfirm: string }
> = {
  mascot: {
    title: "Header Mascot",
    help: "The picture on the left of the header. Transparent PNG works best. Shown up to 112px tall.",
    upload: "Upload New Mascot",
    reset: "Reset to Default",
    resetConfirm: "Go back to the original mascot picture?",
  },
  wordmark: {
    title: "Header Wordmark",
    help: 'Replaces the "ONE CRUNCH LADY" text next to the mascot. Transparent PNG works best. Shown up to 64px tall and 340px wide.',
    upload: "Upload Wordmark Image",
    reset: "Reset to Text",
    resetConfirm: 'Go back to the "ONE CRUNCH LADY" text?',
  },
};

/**
 * Manages the admin-editable header logo pieces (site_branding,
 * 017_create_site_branding.sql). Each slot previews exactly what the
 * header renders - it reuses HeaderMascot/HeaderWordmark on the header's
 * own background - so what the owner sees here is what customers get.
 */
export default function AdminBrandingPanel({
  initialBranding,
  onFeedback,
}: {
  initialBranding: AdminBranding;
  onFeedback: (message: string) => void;
}) {
  const savedMascot = toBrandImage(
    initialBranding.header_mascot_url,
    initialBranding.header_mascot_width,
    initialBranding.header_mascot_height
  );
  const savedWordmark = toBrandImage(
    initialBranding.header_wordmark_url,
    initialBranding.header_wordmark_width,
    initialBranding.header_wordmark_height
  );

  return (
    <section className="rounded-2xl border-[3px] border-cookie-brown bg-flour-white p-6">
      <h2 className="font-display text-4xl uppercase text-cookie-brown-dark">Header Logo</h2>
      <p className="mt-2 text-sm text-cookie-brown-dark">
        Changes show on every page of the site as soon as you save.
      </p>
      <div className="mt-4 grid gap-4">
        <BrandingSlotCard slot="mascot" saved={savedMascot} onFeedback={onFeedback} />
        <BrandingSlotCard slot="wordmark" saved={savedWordmark} onFeedback={onFeedback} />
      </div>
    </section>
  );
}

function BrandingSlotCard({
  slot,
  saved,
  onFeedback,
}: {
  slot: BrandingSlot;
  saved: BrandImage | null;
  onFeedback: (message: string) => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<ImageDraft>(EMPTY_DRAFT);
  const [isBusy, setIsBusy] = useState(false);
  const copy = SLOT_COPY[slot];

  const draftImage = draftToImage(draft);
  // Preview the staged upload if there is one, otherwise what's live.
  const previewImage = draftImage ?? saved;
  const hasUnsavedUpload = draft.url !== "";
  const canSave = draftImage !== null && !isBusy;

  async function handleSave() {
    if (!draftImage) {
      return;
    }
    setIsBusy(true);
    try {
      const result = await setHeaderImage(slot, {
        image_url: draftImage.url,
        image_width: draftImage.width,
        image_height: draftImage.height,
      });
      assertOk(result);
      onFeedback(`${copy.title} saved.`);
      setDraft(EMPTY_DRAFT);
      router.refresh();
    } catch (error) {
      onFeedback(error instanceof Error ? error.message : "Failed to save logo.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleReset() {
    if (!window.confirm(copy.resetConfirm)) {
      return;
    }
    setIsBusy(true);
    try {
      assertOk(await resetHeaderImage(slot));
      onFeedback(`${copy.title} reset.`);
      setDraft(EMPTY_DRAFT);
      router.refresh();
    } catch (error) {
      onFeedback(error instanceof Error ? error.message : "Failed to reset logo.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="rounded-xl border-2 border-cookie-brown p-4">
      <h3 className="font-display text-2xl uppercase text-cookie-brown-dark">{copy.title}</h3>
      <p className="mt-1 text-sm text-cookie-brown-dark">{copy.help}</p>

      {/* Same background as the real header (Header.tsx's bg-[#EFECEB]). */}
      <div className="mt-3 flex min-h-[7.5rem] items-center gap-2 overflow-hidden rounded-md border-2 border-cookie-brown bg-[#EFECEB] px-4 py-1.5">
        {slot === "mascot" ? (
          <HeaderMascot image={previewImage ?? defaultHeaderMascot} />
        ) : (
          <HeaderWordmark image={previewImage} />
        )}
      </div>
      <p className="mt-1 text-xs text-cookie-brown-dark">
        {hasUnsavedUpload
          ? "Preview of your upload - not saved yet."
          : saved
            ? `Custom image (${saved.width}x${saved.height}).`
            : slot === "mascot"
              ? "Using the original mascot."
              : 'Using the "ONE CRUNCH LADY" text.'}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <CloudinaryImageField
          value={draft.url}
          onChange={(url) => setDraft((current) => ({ ...current, url }))}
          onDimensions={(width, height) => setDraft((current) => ({ ...current, width, height }))}
          buttonLabel={copy.upload}
          selectedLabel="New image ready to save"
          emptyLabel=""
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="tap-target rounded-md border-2 border-cookie-brown bg-hero-yellow px-4 text-sm font-semibold text-cookie-brown-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          Save
        </button>
        {hasUnsavedUpload ? (
          <button
            type="button"
            onClick={() => setDraft(EMPTY_DRAFT)}
            disabled={isBusy}
            className="tap-target rounded-md border-2 border-cookie-brown px-4 text-sm font-semibold text-cookie-brown-dark"
          >
            Cancel
          </button>
        ) : null}
        {saved && !hasUnsavedUpload ? (
          <button
            type="button"
            onClick={handleReset}
            disabled={isBusy}
            className="tap-target rounded-md border-2 border-cookie-brown px-4 text-sm font-semibold text-cookie-brown-dark transition hover:text-power-red"
          >
            {copy.reset}
          </button>
        ) : null}
      </div>
      {hasUnsavedUpload && !draftImage ? (
        <p className="mt-2 text-sm font-semibold text-power-red">
          Couldn&apos;t read this image&apos;s size - please upload it again.
        </p>
      ) : null}
    </div>
  );
}
