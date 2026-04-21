"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ADMIN_EMAIL = "amadeus12321@gmail.com";

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password,
    });

    if (signInError) {
      setError("Login failed. Please check your password and try again.");
      setLoading(false);
      return;
    }

    router.replace("/admin/orders");
    router.refresh();
  }

  return (
    <main className="responsive-shell px-4 py-12 tablet:px-6 desktop:px-8">
      <section className="rounded-2xl border-[3px] border-cookie-brown bg-flour-white p-6">
        <h1 className="font-display text-5xl uppercase text-cookie-brown">
          Admin Login
        </h1>
        <p className="mt-2 text-sm text-cookie-brown">
          Sign in as owner to manage orders and product availability.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="adminEmail"
              className="mb-1 block text-sm font-semibold text-cookie-brown"
            >
              Admin Email
            </label>
            <input
              id="adminEmail"
              type="email"
              value={ADMIN_EMAIL}
              readOnly
              className="tap-target w-full rounded-md border-2 border-cookie-brown bg-cookie-brown/10 px-3 text-cookie-brown"
            />
          </div>

          <div>
            <label
              htmlFor="adminPassword"
              className="mb-1 block text-sm font-semibold text-cookie-brown"
            >
              Password
            </label>
            <input
              id="adminPassword"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="tap-target w-full rounded-md border-2 border-cookie-brown px-3 text-cookie-brown"
            />
          </div>

          {error ? (
            <p className="text-sm font-semibold text-power-red">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="tap-target inline-flex items-center justify-center rounded-md border-[3px] border-cookie-brown bg-power-red px-5 font-bold text-flour-white disabled:cursor-not-allowed disabled:brightness-90"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>

          <div>
            <Link
              href="/admin/reset-password"
              className="tap-target inline-flex items-center text-sm font-semibold text-cookie-brown underline underline-offset-4"
            >
              Forgot Password?
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
