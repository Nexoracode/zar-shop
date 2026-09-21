import { z } from "zod";
import { homepageFieldLimits } from "@/modules/settings/settings-limits";

// A link an admin may put on the storefront: an internal path or an https URL. Kept in its own module
// (no database or cache imports) so client forms can run the very same check the server does.
export const safeHrefSchema = z.string().trim().min(1).max(homepageFieldLimits.href).refine(
  (value) => (/^\/(?!\/)/.test(value) || /^https:\/\//i.test(value)),
  "لینک دکمه باید یک مسیر داخلی یا نشانی امن HTTPS باشد.",
);
