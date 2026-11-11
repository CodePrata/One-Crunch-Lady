"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * A different message per failure (audit 2026-11 F-2) - "check your
 * password" for a network error or rate limit sends the owner off to
 * reset a password that was fine.
 */
function loginErrorMessage(error: { status?: number; code?: string; name?: string }): string {
  if (error.code === "email_not_confirmed") {
    return "This email address hasn't been confirmed yet. Check your inbox for the confirmation link.";
  }
  if (error.status === 429 || error.code === "over_request_rate_limit") {
    return "Too many login attempts. Please wait a few minutes and try again.";
  }
  if (error.name === "AuthRetryableFetchError" || !error.status || error.status >= 500) {
    return "We couldn't reach the login server. Check your internet connection and try again.";
  }
  return "Wrong email or password. Please try again, or use Forgot Password below.";
}

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(loginErrorMessage(signInError));
      setLoading(false);
      return;
    }

    router.replace("/admin/orders");
    router.refresh();
  }

  return (
    <main className="responsive-shell px-4 py-12 tablet:px-6 desktop:px-8">
      <section className="rounded-2xl border-[3px] border-cookie-brown bg-flour-white p-6">
        <h1 className="font-display text-5xl uppercase text-cookie-brown-dark">Admin Login</h1>
        <p className="mt-2 text-sm text-cookie-brown-dark">
          Sign in as owner to manage orders and product availability.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="adminEmail"
              className="mb-1 block text-sm font-semibold text-cookie-brown-dark"
            >
              Admin Email
            </label>
            <input
              id="adminEmail"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="tap-target w-full rounded-md border-2 border-cookie-brown px-3 text-cookie-brown-dark"
            />
          </div>

          <div>
            <label
              htmlFor="adminPassword"
              className="mb-1 block text-sm font-semibold text-cookie-brown-dark"
            >
              Password
            </label>
            <input
              id="adminPassword"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="tap-target w-full rounded-md border-2 border-cookie-brown px-3 text-cookie-brown-dark"
            />
          </div>

          {error ? <p className="text-sm font-semibold text-power-red">{error}</p> : null}

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
              className="tap-target inline-flex items-center text-sm font-semibold text-cookie-brown-dark underline underline-offset-4"
            >
              Forgot Password?
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
