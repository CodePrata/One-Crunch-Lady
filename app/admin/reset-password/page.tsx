"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecoveryContext, setIsRecoveryContext] = useState(false);

  const hasRecoveryHash = useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.location.hash.includes("type=recovery");
  }, []);

  useEffect(() => {
    async function verifyRecoverySession() {
      if (!hasRecoveryHash) {
        setError("This page only works from a Supabase password recovery link.");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("Recovery session not found. Please request a new reset link.");
        return;
      }

      setIsRecoveryContext(true);
    }

    void verifyRecoverySession();
  }, [hasRecoveryHash, supabase.auth]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!isRecoveryContext) {
      setError("Invalid recovery context. Please use the email recovery link.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

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
        <h1 className="font-display text-5xl uppercase text-cookie-brown">
          Reset Password
        </h1>
        <p className="mt-2 text-sm text-cookie-brown">
          Use your recovery link session to set a new admin password.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="newPassword"
              className="mb-1 block text-sm font-semibold text-cookie-brown"
            >
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="tap-target w-full rounded-md border-2 border-cookie-brown px-3 text-cookie-brown"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1 block text-sm font-semibold text-cookie-brown"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              className="tap-target w-full rounded-md border-2 border-cookie-brown px-3 text-cookie-brown"
            />
          </div>

          {error ? (
            <p className="text-sm font-semibold text-power-red">{error}</p>
          ) : null}
          {message ? (
            <p className="text-sm font-semibold text-cookie-brown">{message}</p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="tap-target inline-flex items-center justify-center rounded-md border-[3px] border-cookie-brown bg-power-red px-5 font-bold text-flour-white disabled:cursor-not-allowed disabled:brightness-90"
          >
            {isSubmitting ? "Updating..." : "Update Password"}
          </button>
        </form>
      </section>
    </main>
  );
}
