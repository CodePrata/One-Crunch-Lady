import type { Metadata } from "next";
import ContactForm from "@/components/features/ContactForm";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with One Crunch Lady - questions, custom orders, or just to say hi.",
};

export default function ContactPage() {
  return (
    <main className="responsive-shell px-4 py-10 tablet:px-6 desktop:px-8">
      <h1 className="font-display text-5xl uppercase leading-none text-cookie-brown-dark tablet:text-6xl">
        Contact Us
      </h1>
      <p className="mt-3 max-w-xl text-base text-cookie-brown-dark">
        Got a question, a custom order request, or just want to say hi? Send us a message and
        we&apos;ll get back to you.
      </p>

      <div className="mx-auto mt-8 max-w-xl">
        <div className="impact-border rounded-2xl bg-flour-white p-6 tablet:p-8">
          <ContactForm />
        </div>
      </div>
    </main>
  );
}
