"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { submitContactMessage } from "@/app/actions/contact";
import { contactSchema, type ContactFormValues } from "@/lib/validations/contact";
import { useCartStore } from "@/lib/store/cart";

export default function ContactForm() {
  const showToast = useCartStore((state) => state.showToast);
  const [submitted, setSubmitted] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { email: "", message: "", website: "" },
    mode: "onBlur",
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmissionError(null);
    const result = await submitContactMessage(values);

    if (!result.success) {
      setSubmissionError(
        result.error ?? "We could not send your message right now. Please try again."
      );
      return;
    }

    setSubmitted(true);
    reset();
    // Reuses the same global toast the cart already shows for "added to
    // cart" confirmations (mounted once in the storefront layout) rather
    // than building a second toast system just for this form.
    showToast("Your message has been sent!");
  });

  if (submitted) {
    return (
      <div className="rounded-xl border-2 border-cookie-brown bg-hero-yellow/30 p-6 text-center">
        <p className="font-display text-2xl uppercase text-cookie-brown-dark">Message Sent!</p>
        <p className="mt-2 text-base text-cookie-brown-dark">
          Thanks for reaching out - we&apos;ll get back to you soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {/* Honeypot: hidden from real visitors (display:none doesn't stop
          this JS-driven submission from carrying its value, unlike a
          native form POST in older browsers), but visible in the markup
          to a naive bot that fills every field it finds. Checked in
          app/actions/contact.ts, separately from the zod schema, so a
          caught bot gets a fake success instead of a tell-tale error. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="contactWebsite">Leave this field blank</label>
        <input
          id="contactWebsite"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register("website")}
        />
      </div>

      <div>
        <label
          htmlFor="contactEmail"
          className="mb-1 block text-sm font-semibold text-cookie-brown-dark"
        >
          Email
        </label>
        <input
          id="contactEmail"
          type="email"
          className="tap-target w-full rounded-md border-2 border-cookie-brown px-3 text-cookie-brown-dark"
          aria-label="Your email"
          {...register("email")}
        />
        {errors.email ? (
          <p className="mt-1 text-sm font-semibold text-power-red">{errors.email.message}</p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="contactMessage"
          className="mb-1 block text-sm font-semibold text-cookie-brown-dark"
        >
          Message
        </label>
        <textarea
          id="contactMessage"
          rows={6}
          className="w-full rounded-md border-2 border-cookie-brown px-3 py-2 text-cookie-brown-dark"
          aria-label="Your message"
          {...register("message")}
        />
        {errors.message ? (
          <p className="mt-1 text-sm font-semibold text-power-red">{errors.message.message}</p>
        ) : null}
      </div>

      {submissionError ? (
        <div className="rounded-md border-2 border-power-red bg-power-red/10 p-3">
          <p className="text-sm font-semibold text-power-red">{submissionError}</p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="tap-target inline-flex w-full items-center justify-center rounded-md border-[3px] border-cookie-brown bg-power-red px-5 font-bold text-flour-white disabled:cursor-not-allowed disabled:brightness-90"
      >
        {isSubmitting ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-flour-white border-r-transparent" />
            Sending...
          </span>
        ) : (
          "Send Message"
        )}
      </button>
    </form>
  );
}
