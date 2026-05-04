/**
 * Shared action result type for server actions.
 * Provides a discriminated union for consistent success/error handling.
 */
export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };
