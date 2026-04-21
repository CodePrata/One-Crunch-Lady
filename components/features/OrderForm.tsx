"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { createOrder } from "@/app/actions/orders";
import {
  type OrderFormValues,
  orderSchema,
} from "@/lib/validations/order";

interface OrderFormProduct {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

interface OrderFormProps {
  products: OrderFormProduct[];
  paynowNumber: string;
  whatsappNumber: string;
}

const STEP_LABELS = ["Details", "Selection", "Confirmation"] as const;

export default function OrderForm({
  products,
  paynowNumber,
  whatsappNumber,
}: OrderFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isCopySuccess, setIsCopySuccess] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const idempotencyToken = useMemo(() => {
    return crypto.randomUUID();
  }, []);

  const defaultQuantities = useMemo(() => {
    return products.reduce<Record<string, number>>((acc, product) => {
      acc[product.id] = 0;
      return acc;
    }, {});
  }, [products]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      quantities: defaultQuantities,
      paymentAcknowledged: false,
      idempotencyToken,
    },
    mode: "onBlur",
  });

  const quantities = watch("quantities");
  const selectedItems = products
    .map((product) => ({
      product,
      quantity: quantities?.[product.id] ?? 0,
      lineTotal: (quantities?.[product.id] ?? 0) * product.price,
    }))
    .filter((item) => item.quantity > 0);
  const grandTotal = selectedItems.reduce((total, item) => total + item.lineTotal, 0);

  async function handleNextStep() {
    if (step === 0) {
      const isValid = await trigger([
        "customerName",
        "customerEmail",
        "customerPhone",
      ]);
      if (!isValid) {
        return;
      }
    }

    if (step === 1) {
      const isValid = await trigger("quantities");
      if (!isValid) {
        return;
      }
    }

    setStep((currentStep) => Math.min(currentStep + 1, STEP_LABELS.length - 1));
  }

  function handleBackStep() {
    setStep((currentStep) => Math.max(currentStep - 1, 0));
  }

  function updateQuantity(productId: string, nextValue: number) {
    const safeValue = Math.max(0, Math.min(10, nextValue));
    setValue(`quantities.${productId}`, safeValue, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  async function copyPayNowNumber() {
    if (!paynowNumber) {
      return;
    }

    try {
      await navigator.clipboard.writeText(paynowNumber);
      setIsCopySuccess(true);
      window.setTimeout(() => setIsCopySuccess(false), 1800);
    } catch {
      setIsCopySuccess(false);
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    setSubmissionError(null);
    const result = await createOrder(values);

    if (!result.success || !result.orderRef) {
      setSubmissionError(
        result.error ??
          "We could not submit your order right now. Tap WhatsApp below to place your order directly."
      );
      return;
    }

    router.replace(`/order/success/${result.orderRef}`);
  });

  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}`
    : "https://wa.me/";

  return (
    <section
      id="order-form"
      className="relative rounded-2xl border-[3px] border-cookie-brown bg-flour-white p-5 tablet:p-7"
    >
      {isSubmitting ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center rounded-2xl bg-cookie-brown/70 p-4">
          <p className="font-display text-3xl uppercase text-flour-white">
            Transmitting Data...
          </p>
        </div>
      ) : null}

      <div className="mb-6">
        <h2 className="font-display text-4xl uppercase text-cookie-brown tablet:text-5xl">
          Build Your Order
        </h2>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {STEP_LABELS.map((label, index) => {
            const isComplete = index <= step;
            return (
              <div key={label} className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-cookie-brown">
                  {label}
                </p>
                <div
                  className={`h-2 rounded-full border border-cookie-brown ${
                    isComplete ? "bg-power-red" : "bg-flour-white"
                  }`}
                  aria-hidden="true"
                />
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={onSubmit} noValidate>
        <div className="transition-all duration-300">
          {step === 0 ? (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="customerName"
                  className="mb-1 block text-sm font-semibold text-cookie-brown"
                >
                  Name
                </label>
                <p id="customerNameHelp" className="mb-1 text-xs text-cookie-brown">
                  Enter your full name (minimum 2 characters).
                </p>
                <input
                  id="customerName"
                  type="text"
                  className="tap-target w-full rounded-md border-2 border-cookie-brown px-3 text-cookie-brown"
                  aria-label="Customer name"
                  aria-describedby="customerNameHelp"
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
                  htmlFor="customerEmail"
                  className="mb-1 block text-sm font-semibold text-cookie-brown"
                >
                  Email
                </label>
                <p id="customerEmailHelp" className="mb-1 text-xs text-cookie-brown">
                  We will send order updates here.
                </p>
                <input
                  id="customerEmail"
                  type="email"
                  className="tap-target w-full rounded-md border-2 border-cookie-brown px-3 text-cookie-brown"
                  aria-label="Customer email"
                  aria-describedby="customerEmailHelp"
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
                  htmlFor="customerPhone"
                  className="mb-1 block text-sm font-semibold text-cookie-brown"
                >
                  Phone (Singapore)
                </label>
                <p id="customerPhoneHelp" className="mb-1 text-xs text-cookie-brown">
                  Format: +65XXXXXXXX or 8/9XXXXXXXX.
                </p>
                <input
                  id="customerPhone"
                  type="tel"
                  className="tap-target w-full rounded-md border-2 border-cookie-brown px-3 text-cookie-brown"
                  aria-label="Customer phone"
                  aria-describedby="customerPhoneHelp"
                  {...register("customerPhone")}
                />
                {errors.customerPhone ? (
                  <p className="mt-1 text-sm font-semibold text-power-red">
                    {errors.customerPhone.message}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
              {products.map((product) => {
                const qty = quantities?.[product.id] ?? 0;
                return (
                  <div
                    key={product.id}
                    className="rounded-lg border-2 border-cookie-brown p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-display text-3xl uppercase text-cookie-brown">
                          {product.name}
                        </p>
                        <p className="text-sm font-semibold text-cookie-brown">
                          ${product.price.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQuantity(product.id, qty - 1)}
                          className="tap-target inline-flex w-11 items-center justify-center rounded-md border-2 border-cookie-brown text-xl font-bold text-cookie-brown"
                          aria-label={`Decrease ${product.name} quantity`}
                        >
                          -
                        </button>
                        <span
                          className="inline-flex min-w-[44px] justify-center rounded-md border border-cookie-brown px-2 py-2 text-base font-semibold text-cookie-brown"
                          aria-label={`${product.name} quantity ${qty}`}
                        >
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(product.id, qty + 1)}
                          className="tap-target inline-flex w-11 items-center justify-center rounded-md border-2 border-cookie-brown text-xl font-bold text-cookie-brown"
                          aria-label={`Increase ${product.name} quantity`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {errors.quantities ? (
                <p className="text-sm font-semibold text-power-red">
                  {typeof errors.quantities.message === "string"
                    ? errors.quantities.message
                    : "Please select at least 1 item."}
                </p>
              ) : null}

              <div className="rounded-lg border-2 border-cookie-brown bg-hero-yellow/40 p-4">
                <p className="text-sm font-semibold uppercase tracking-wide text-cookie-brown">
                  Live Subtotal
                </p>
                <p className="font-display text-4xl text-cookie-brown">
                  ${grandTotal.toFixed(2)}
                </p>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-5">
              <div className="rounded-lg border-2 border-cookie-brown p-4">
                <p className="font-display text-3xl uppercase text-cookie-brown">
                  Order Summary
                </p>
                {selectedItems.length === 0 ? (
                  <p className="mt-2 text-sm text-cookie-brown">
                    No items selected.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {selectedItems.map((item) => (
                      <li
                        key={item.product.id}
                        className="flex items-center justify-between text-sm text-cookie-brown"
                      >
                        <span>
                          {item.product.name} x {item.quantity}
                        </span>
                        <span className="font-semibold">
                          ${item.lineTotal.toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <p className="mt-4 rounded-md border-2 border-cookie-brown bg-hero-yellow px-3 py-2 text-center font-display text-4xl text-cookie-brown">
                  Total: ${grandTotal.toFixed(2)}
                </p>
              </div>

              <div className="rounded-lg border-2 border-cookie-brown p-4">
                <p className="text-sm font-semibold uppercase tracking-wide text-cookie-brown">
                  PayNow Number
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-cookie-brown px-3 py-2 font-bold text-cookie-brown">
                    {paynowNumber}
                  </span>
                  <button
                    type="button"
                    onClick={copyPayNowNumber}
                    className="tap-target rounded-md border-2 border-cookie-brown px-3 text-sm font-semibold text-cookie-brown"
                  >
                    {isCopySuccess ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              <div>
                <label className="flex items-start gap-2 text-sm text-cookie-brown">
                  <input
                    type="checkbox"
                    className="tap-target mt-1 h-5 w-5 border-2 border-cookie-brown"
                    aria-label="Acknowledge payment proof requirement"
                    aria-describedby="paymentAcknowledgedHelp"
                    {...register("paymentAcknowledged")}
                  />
                  <span id="paymentAcknowledgedHelp">
                    I understand I need to send payment proof via WhatsApp to
                    confirm my order.
                  </span>
                </label>
                {errors.paymentAcknowledged ? (
                  <p className="mt-1 text-sm font-semibold text-power-red">
                    {errors.paymentAcknowledged.message}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {step > 0 ? (
            <button
              type="button"
              onClick={handleBackStep}
              className="tap-target inline-flex items-center justify-center rounded-md border-2 border-cookie-brown px-4 font-semibold text-cookie-brown"
            >
              Back
            </button>
          ) : null}

          {step < STEP_LABELS.length - 1 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="tap-target inline-flex items-center justify-center rounded-md border-[3px] border-cookie-brown bg-power-red px-5 font-bold text-flour-white"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="tap-target inline-flex items-center justify-center rounded-md border-[3px] border-cookie-brown bg-power-red px-5 font-bold text-flour-white disabled:cursor-not-allowed disabled:brightness-90"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-flour-white border-r-transparent" />
                  Submitting...
                </span>
              ) : (
                "Submit Order"
              )}
            </button>
          )}
        </div>

        {submissionError ? (
          <div className="mt-4 rounded-md border-2 border-power-red bg-power-red/10 p-3">
            <p className="text-sm font-semibold text-power-red">{submissionError}</p>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="tap-target mt-3 inline-flex items-center justify-center rounded-md border-2 border-cookie-brown bg-flour-white px-4 text-sm font-semibold text-cookie-brown"
            >
              Order via WhatsApp Instead
            </a>
          </div>
        ) : null}
      </form>
    </section>
  );
}
