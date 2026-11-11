import type { AdminResult } from "@/types/admin";

/**
 * For admin panels: turns a failed AdminResult back into a thrown Error so
 * the panels' existing try/catch → onFeedback(error.message) handling
 * keeps working. The throw happens in the browser, so unlike a throw
 * inside the Server Action, the message isn't hidden in production.
 */
export function assertOk(result: AdminResult): void {
  if (!result.ok) {
    throw new Error(result.error);
  }
}
