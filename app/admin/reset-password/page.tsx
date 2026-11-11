"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Matches the minimum set in Supabase → Authentication → Email (audit 2026-11 F-3). */
const MIN_PASSWORD_LENGTH = 12;

type Mode = "checking" | "request" | "set";

const INVALID_LINK_MESSAGE =
  "This reset link has expired, was already used, or was opened in a different browser from the one you requested it in. Request a new link below.";

/**
 * Two modes (audit 2026-11 S-5):
 *
 * - request: an email field that sends a Supabase password-reset link to
 *   /admin/reset-password. Before this, "Forgot Password?" led to a page
 *   that only worked from a link nothing in the app could send.
 * - set: opened from that link. @supabase/ssr's browser client uses the
 *   PKCE flow, so the link arrives as ?code=..., which the client
 *   exchanges for a session on load (the old page only looked for the
 *   implicit-flow #type=recovery hash, which PKCE never produces). PKCE
 *   also means the link must be opened in the browser that requested it.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [mode, setMode] = useState<Mode>("checking");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
    const linkError =
      url.searchParams.get("error_description") ?? hashParams.get("error_description");
    const fromRecoveryLink = url.searchParams.has("code") || hashParams.get("type") === "recovery";

    if (linkError) {
      setError(INVALID_LINK_MESSAGE);
      setMode("request");
      return;
    }

    if (!fromRecoveryLink) {
      setMode("request");
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN")) {
        setMode("set");
      }
    });

    // getSession waits for the client to finish exchanging the link's
    // code, so if there's still no session afterwards the link was bad.
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setMode("set");
      } else {
        setError(INVALID_LINK_MESSAGE);
        setMode("request");
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleRequestLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/admin/reset-password`,
    });

    setIsSubmitting(false);

    if (resetError) {
      if (resetError.status === 429) {
        setError("Too many requests. Please wait a minute and try again.");
        return;
      }
      console.error("resetPasswordForEmail failed", resetError);
      setError("We couldn't send the link right now. Please try again in a few minutes.");
      return;
    }

    // Same message whether or not the address is an admin account, so
    // the form can't be used to find out which emails have accounts.
    setMessage(
      "If that email belongs to an admin account, a reset link is on its way. Open it in this browser."
    );
  }

  async function handleSetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setIsSubmitting(false);
      return;
    }

    setMessage("Password updated. Redirecting to admin login...");
    await supabase.auth.signOut();
    setTimeout(() => {
      router.replace("/admin/login");
      router.refresh();
    }, 1200);
  }

  return (
    <main className="responsive-shell px-4 py-12 tablet:px-6 desktop:px-8">
      <section className="rounded-2xl border-[3px] border-cookie-brown bg-flour-white p-6">
        <h1 className="font-display text-5xl uppercase text-cookie-brown-dark">Reset Password</h1>

        {mode === "checking" ? (
          <p className="mt-2 text-sm text-cookie-brown-dark" role="status">
            Checking your reset link...
          </p>
        ) : null}

        {mode === "request" ? (
          <>
            <p className="mt-2 text-sm text-cookie-brown-dark">
              Enter your admin email and we&apos;ll send you a link to set a new password.
            </p>
            <form onSubmit={handleRequestLink} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="resetEmail"
                  className="mb-1 block text-sm font-semibold text-cookie-brown-dark"
                >
                  Admin Email
                </label>
                <input
                  id="resetEmail"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="tap-target w-full rounded-md border-2 border-cookie-brown px-3 text-cookie-brown-dark"
                />
              </div>

              <FormMessages error={error} message={message} />

              <button
                type="submit"
                disabled={isSubmitting}
                className="tap-target inline-flex items-center justify-center rounded-md border-[3px] border-cookie-brown bg-power-red px-5 font-bold text-flour-white disabled:cursor-not-allowed disabled:brightness-90"
              >
                {isSubmitting ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          </>
        ) : null}

        {mode === "set" ? (
          <>
            <p className="mt-2 text-sm text-cookie-brown-dark">
              Choose a new password of at least {MIN_PASSWORD_LENGTH} characters, with upper- and
              lower-case letters and a number.
            </p>
            <form onSubmit={handleSetPassword} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="newPassword"
                  className="mb-1 block text-sm font-semibold text-cookie-brown-dark"
                >
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  className="tap-target w-full rounded-md border-2 border-cookie-brown px-3 text-cookie-brown-dark"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-1 block text-sm font-semibold text-cookie-brown-dark"
                >
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  className="tap-target w-full rounded-md border-2 border-cookie-brown px-3 text-cookie-brown-dark"
                />
              </div>

              <FormMessages error={error} message={message} />

              <button
                type="submit"
                disabled={isSubmitting}
                className="tap-target inline-flex items-center justify-center rounded-md border-[3px] border-cookie-brown bg-power-red px-5 font-bold text-flour-white disabled:cursor-not-allowed disabled:brightness-90"
              >
                {isSubmitting ? "Updating..." : "Update Password"}
              </button>
            </form>
          </>
        ) : null}

        <div className="mt-4">
          <Link
            href="/admin/login"
            className="tap-target inline-flex items-center text-sm font-semibold text-cookie-brown-dark underline underline-offset-4"
          >
            Back to login
          </Link>
        </div>
      </section>
    </main>
  );
}

function FormMessages({ error, message }: { error: string | null; message: string | null }) {
  return (
    <>
      {error ? (
        <p className="text-sm font-semibold text-power-red" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm font-semibold text-cookie-brown-dark" role="status">
          {message}
        </p>
      ) : null}
    </>
  );
}
