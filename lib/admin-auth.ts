import "server-only";
import type { User } from "@supabase/supabase-js";
import { supabaseServerAuth } from "@/lib/supabase/server";
import type { AdminResult } from "@/types/admin";

/**
 * An expected admin failure whose message is safe and useful to show the
 * owner ("That promo code already exists."). Anything else thrown inside
 * runAdminAction is treated as unexpected: logged, and replaced with a
 * generic message.
 */
export class AdminActionError extends Error {}

/**
 * Throws an AdminActionError with a friendly message, logging the raw
 * cause (usually a Supabase error) server-side only.
 */
export function adminFail(message: string, cause?: unknown): never {
  if (cause) {
    console.error(`[admin] ${message}`, cause);
  }
  throw new AdminActionError(message);
}

/**
 * The real admin gate (middleware.ts only checks that *someone* is logged
 * in). Every admin action must call this first. Returns the admin's auth
 * user so actions can record who did what.
 *
 * Lives here, not in app/actions/admin.ts: every export of a "use server"
 * file becomes a callable endpoint.
 */
export async function assertAdminAccess(): Promise<User> {
  const authClient = supabaseServerAuth();
  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser();

  if (userError || !user) {
    throw new AdminActionError("Your session has expired. Please log in again.");
  }

  const { data: isAdmin, error: isAdminError } = await authClient.rpc("is_admin");

  if (isAdminError || isAdmin !== true) {
    throw new AdminActionError("This account doesn't have admin access.");
  }

  return user;
}

/**
 * Runs an admin mutation and converts the outcome into an AdminResult.
 * Expected failures (AdminActionError) keep their message; unexpected ones
 * are logged and shown as a generic message.
 */
export async function runAdminAction(fn: () => Promise<void>): Promise<AdminResult> {
  try {
    await fn();
    return { ok: true };
  } catch (error) {
    if (error instanceof AdminActionError) {
      return { ok: false, error: error.message };
    }
    console.error("[admin] unexpected error", error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
