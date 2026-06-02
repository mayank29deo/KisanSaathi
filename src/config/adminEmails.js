// Single source of truth for admin email allowlist on the client side.
// Server-side enforcement still lives in api/admin/_auth.js (uses ADMIN_EMAILS env var).
// Both must agree for an account to actually access the dashboard.

export const ADMIN_EMAILS = ["mayank29deo@gmail.com"];

export function isAdminEmail(email) {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}
