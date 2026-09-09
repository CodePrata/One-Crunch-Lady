import Link from "next/link";
import { redirect } from "next/navigation";
import { buildPayNowQrPayload, renderPayNowQrSvg } from "@/lib/paynow";
import { createClient } from "@/lib/supabase/server";

interface SuccessPageProps {
  params: {
    orderRef: string;
  };
}

export default async function OrderSuccessPage({ params }: SuccessPageProps) {
  const supabase = createClient();
  const paynowNumber = process.env.PAYNOW_NUMBER ?? "PayNow unavailable";
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
  const { orderRef } = params;

  const { data, error } = await supabase
    .from("orders")
    .select("order_ref,total_price")
    .eq("order_ref", orderRef)
    .maybeSingle();

  if (error || !data) {
    redirect("/");
  }

  const formattedTotal = Number(data.total_price).toFixed(2);
  const whatsappMessage = encodeURIComponent(
    `Hi One Crunch Lady, here is my payment proof for Order #${data.order_ref}!`
  );
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`
    : "https://wa.me/";

  // Bound strictly server-side: PAYNOW_NUMBER never reaches the client,
  // and the amount/reference come from the just-committed order row, not
  // anything client-supplied. Returns null (no QR, plain-number fallback
  // stays visible below) if PAYNOW_NUMBER is missing or malformed.
  const qrPayload = buildPayNowQrPayload({
    amount: Number(data.total_price),
    reference: data.order_ref,
    mobileNumber: process.env.PAYNOW_NUMBER ?? "",
  });
  const qrSvg = qrPayload ? await renderPayNowQrSvg(qrPayload) : null;

  return (
    <main className="responsive-shell px-4 py-10 tablet:px-6 desktop:px-8">
      <section className="rounded-2xl border-[3px] border-cookie-brown bg-flour-white p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-cookie-brown">
          Order Submitted
        </p>
        <h1 className="mt-2 font-display text-6xl uppercase leading-none text-cookie-brown tablet:text-7xl">
          {data.order_ref}
        </h1>

        <div className="mt-5 flex items-center gap-4 rounded-xl border-2 border-cookie-brown bg-hero-yellow/35 p-4">
          <svg viewBox="0 0 200 120" className="h-16 w-24" aria-hidden="true">
            <rect
              x="10"
              y="12"
              width="180"
              height="96"
              rx="14"
              fill="#FFD700"
              stroke="#D32F2F"
              strokeWidth="8"
            />
            <text
              x="100"
              y="72"
              textAnchor="middle"
              style={{
                fontFamily: "var(--font-bangers), Impact, sans-serif",
                fontSize: 34,
                fill: "#8D6E63",
              }}
            >
              SUCCESS
            </text>
          </svg>
          <p className="text-sm font-semibold text-cookie-brown">
            Order submitted! Please proceed with payment.
          </p>
        </div>

        <div className="mt-6 space-y-3 rounded-xl border-2 border-cookie-brown p-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-cookie-brown">
            Final Amount
          </p>
          <p className="font-display text-5xl text-cookie-brown">${formattedTotal}</p>

          {qrSvg ? (
            <div className="flex flex-col items-center gap-2 pt-1">
              <div
                className="w-48 rounded-xl border-2 border-cookie-brown bg-flour-white p-3"
                // Trusted markup: generated server-side by the qrcode
                // library from our own payload, never from user input.
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
              <p className="text-center text-xs text-cookie-brown">
                Scan with your banking app to PayNow the exact amount, pre-filled.
              </p>
            </div>
          ) : null}

          <p className="text-sm text-cookie-brown">
            PayNow to: <span className="font-bold">{paynowNumber}</span>
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="tap-target inline-flex items-center justify-center rounded-md border-[3px] border-cookie-brown bg-power-red px-5 font-bold text-flour-white"
          >
            Send Payment Proof on WhatsApp
          </a>
          <Link
            href="/"
            className="tap-target inline-flex items-center justify-center rounded-md border-2 border-cookie-brown px-5 font-semibold text-cookie-brown"
          >
            Back to Home
          </Link>
        </div>
      </section>
    </main>
  );
}
