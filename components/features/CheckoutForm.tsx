"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { createOrder } from "@/app/actions/orders";
import { useCartCatalogItems } from "@/components/features/CartCatalogProvider";
import { whatsappNumber } from "@/config/site";
import { useCartStore } from "@/lib/store/cart";
import {
  checkoutContactSchema,
  type CheckoutContactValues,
  type OrderFormValues,
} from "@/lib/validations/order";

interface CheckoutFormProps {
  /** Rendered above the "Your Details" fields - typically <CartLineItems />, or a page-specific empty state. */
  children?: ReactNode;
  /**
   * Called after a successful order with the fresh order_ref/access_token.
   * The caller decides what happens next - the drawer closes itself then
   * navigates, the /cart page just navigates.
   */
  onSuccess: (result: { orderRef: string; accessToken: string }) => void;
  className?: string;
}

/**
 * Owns checkout end-to-end: contact fields, subtotal, submission, and the
 * WhatsApp fallback on failure. Shared by the cart drawer and the full
 * /cart page so there is exactly one place that calls createOrder from
 * the cart UI - see CheckoutFormProps.onSuccess for how each caller
 * differs after a successful order.
 *
 * Field ids are namespaced with useId() (not hardcoded, as the original
 * drawer-only version had them) because the drawer and the /cart page can
 * legitimately both be mounted at once - the drawer is a global overlay
 * that doesn't unmount on navigation, so a customer could open it, then
 * click the header's Cart link to the full page while it's still open.
 * Hardcoded ids would collide (duplicate DOM ids, broken label
 * association) in that case.
 */
export default function CheckoutForm({ children, onSuccess, className }: CheckoutFormProps) {
  const clearCart = useCartStore((state) => state.clearCart);
  const { lines, unavailableLines, subtotal, itemCount } = useCartCatalogItems();
  const formId = useId();

  const [idempotencyToken, setIdempotencyToken] = useState<string>(() => crypto.randomUUID());
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const whatsappHref = whatsappNumber ? `https://wa.me/${whatsappNumber}` : "https://wa.me/";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutContactValues>({
    resolver: zodResolver(checkoutContactSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      paymentAcknowledged: false,
    },
    mode: "onBlur",
  });

  const canCheckOut = lines.length > 0 && unavailableLines.length === 0;

  const onSubmit = handleSubmit(async (contactValues) => {
    setSubmissionError(null);

    if (!canCheckOut) {
      setSubmissionError(
        unavailableLines.length > 0
          ? "Remove the sold-out items above before checking out."
          : "Your cart is empty."
      );
      return;
    }

    // Cart items ({productId, quantity}[]) mapped into the shape
    // createOrder/orderSchema expects (a productId -> quantity record).
    const quantities = Object.fromEntries(lines.map((line) => [line.product.id, line.quantity]));

    const payload: OrderFormValues = {
      ...contactValues,
      quantities,
      idempotencyToken,
    };

    const result = await createOrder(payload);

    if (!result.success || !result.orderRef || !result.accessToken) {
      setSubmissionError(
        result.error ??
          "We could not submit your order right now. Tap WhatsApp below to place your order directly."
      );
      return;
    }

    clearCart();
    // Fresh token for whatever the customer orders next this session -
    // reusing a spent one would just replay the same orderRef.
    setIdempotencyToken(crypto.randomUUID());
    onSuccess({ orderRef: result.orderRef, accessToken: result.accessToken });
  });

  return (
    <form onSubmit={onSubmit} noValidate className={className}>
      {/*
        Owns padding for its own content AND `children` (rather than
        leaving `children`'s padding to the caller) so the item list,
        "Your Details" fields, and footer below are always consistently
        spaced regardless of which caller renders this - the drawer and
        the /cart page. flex-1/overflow-y-auto only does anything when an
        ancestor constrains height (the drawer's motion.div does; the
        /cart page's plain panel doesn't), so this degrades to an
        ordinary block that scrolls with the page there, harmlessly.
      */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
        {children}

        {lines.length > 0 ? (
          <div className="mt-6 space-y-4 border-t-2 border-cookie-brown pt-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-cookie-brown-dark">
              Your Details
            </p>

            <div>
              <label
                htmlFor={`${formId}-name`}
                className="mb-1 block text-sm font-semibold text-cookie-brown-dark"
              >
                Name
              </label>
              <input
                id={`${formId}-name`}
                type="text"
                className="tap-target w-full rounded-md border-2 border-cookie-brown px-3 text-cookie-brown-dark"
                aria-label="Customer name"
                {...register("customerName")}
              />
              {errors.customerName ? (
                <p className="mt-1 text-sm font-semibold text-power-red">
                  {errors.customerName.message}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor={`${formId}-email`}
                className="mb-1 block text-sm font-semibold text-cookie-brown-dark"
              >
                Email
              </label>
              <input
                id={`${formId}-email`}
                type="email"
                className="tap-target w-full rounded-md border-2 border-cookie-brown px-3 text-cookie-brown-dark"
                aria-label="Customer email"
                {...register("customerEmail")}
              />
              {errors.customerEmail ? (
                <p className="mt-1 text-sm font-semibold text-power-red">
                  {errors.customerEmail.message}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor={`${formId}-phone`}
                className="mb-1 block text-sm font-semibold text-cookie-brown-dark"
              >
                Phone (Singapore)
              </label>
              <p id={`${formId}-phone-help`} className="mb-1 text-xs text-cookie-brown-dark">
                Format: +65XXXXXXXX or 8/9XXXXXXXX.
              </p>
              <input
                id={`${formId}-phone`}
                type="tel"
                className="tap-target w-full rounded-md border-2 border-cookie-brown px-3 text-cookie-brown-dark"
                aria-label="Customer phone"
                aria-describedby={`${formId}-phone-help`}
                {...register("customerPhone")}
              />
              {errors.customerPhone ? (
                <p className="mt-1 text-sm font-semibold text-power-red">
                  {errors.customerPhone.message}
                </p>
              ) : null}
            </div>

            <div>
              <label className="flex items-start gap-2 text-sm text-cookie-brown-dark">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 appearance-none rounded-sm border-2 border-cookie-brown checked:bg-cookie-brown focus:ring-1 focus:ring-cookie-brown"
                  aria-label="Acknowledge payment proof requirement"
                  aria-describedby={`${formId}-payment-ack-help`}
                  {...register("paymentAcknowledged")}
                />
                <span id={`${formId}-payment-ack-help`}>
                  I understand I need to send payment proof via WhatsApp to confirm my order.
                </span>
              </label>
              {errors.paymentAcknowledged ? (
                <p className="mt-1 text-sm font-semibold text-power-red">
                  {errors.paymentAcknowledged.message}
                </p>
              ) : null}
            </div>

            <p className="text-xs text-cookie-brown-dark">
              Your details are used only to fulfil this order. Read our{" "}
              <Link
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline underline-offset-2"
              >
                privacy policy
              </Link>
              .
            </p>

            <p className="text-xs text-cookie-brown-dark">
              Orders are made fresh to order. Review our{" "}
              <Link
                href="/refund"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline underline-offset-2"
              >
                Refund &amp; Cancellation Policy
              </Link>{" "}
              before you pay.
            </p>
          </div>
        ) : null}
      </div>

      {lines.length > 0 ? (
        <div className="space-y-3 border-t-2 border-cookie-brown p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-wide text-cookie-brown-dark">
              Subtotal ({itemCount} item{itemCount === 1 ? "" : "s"})
            </p>
            <p className="font-display text-3xl text-cookie-brown-dark">${subtotal.toFixed(2)}</p>
          </div>

          {unavailableLines.length > 0 ? (
            <p className="text-sm font-semibold text-power-red">
              Remove the sold-out item{unavailableLines.length === 1 ? "" : "s"} above to continue.
            </p>
          ) : null}

          {submissionError ? (
            <div className="rounded-md border-2 border-power-red bg-power-red/10 p-3">
              <p className="text-sm font-semibold text-power-red">{submissionError}</p>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="tap-target mt-3 inline-flex items-center justify-center rounded-md border-2 border-cookie-brown bg-flour-white px-4 text-sm font-semibold text-cookie-brown-dark"
              >
                Order via WhatsApp Instead
              </a>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={!canCheckOut || isSubmitting}
            className="tap-target inline-flex w-full items-center justify-center rounded-md border-[3px] border-cookie-brown bg-power-red px-5 font-bold text-flour-white disabled:cursor-not-allowed disabled:brightness-90"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-flour-white border-r-transparent" />
                Submitting...
              </span>
            ) : (
              "Complete Order"
            )}
          </button>
        </div>
      ) : null}
    </form>
  );
}
