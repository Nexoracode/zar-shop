// A staff member's normal sign-in (storefront password/OTP) only ever yields a customer-level
// session. Admin power comes from a separate, short window opened by signing in at /admin/login:
// it slides forward while the panel is actively used (`ADMIN_IDLE_MS` of inactivity closes it) and
// can never outlive `ADMIN_MAX_MS` from the moment it opened, however busy the session is.
export const ADMIN_IDLE_MS = 1000 * 60 * 30;
export const ADMIN_MAX_MS = 1000 * 60 * 60 * 8;
/** Renewals closer together than this are skipped, so a busy panel doesn't write on every request. */
export const ADMIN_RENEW_THRESHOLD_MS = 1000 * 60 * 2;

export type AdminElevation = { adminSince: Date | null; adminUntil: Date | null };

export function adminElevationActive(session: AdminElevation, now = new Date()) {
  if (!session.adminSince || !session.adminUntil) return false;
  return session.adminUntil > now && session.adminSince.getTime() + ADMIN_MAX_MS > now.getTime();
}

export function startAdminElevation(now = new Date()) {
  return { adminSince: now, adminUntil: new Date(now.getTime() + ADMIN_IDLE_MS) };
}

/** The new `adminUntil` to store, or `null` when the window is closed or was renewed too recently. */
export function renewedAdminUntil(session: AdminElevation, now = new Date()): Date | null {
  if (!adminElevationActive(session, now) || !session.adminSince || !session.adminUntil) return null;
  const target = Math.min(now.getTime() + ADMIN_IDLE_MS, session.adminSince.getTime() + ADMIN_MAX_MS);
  return target - session.adminUntil.getTime() >= ADMIN_RENEW_THRESHOLD_MS ? new Date(target) : null;
}
