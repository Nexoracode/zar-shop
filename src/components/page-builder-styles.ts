import type { CSSProperties } from "react";

// The page builder's dialogs and dock draw their main action in the store's brand primary color, like every other
// storefront button (the builder's own blue is only for its selection chrome — see `page-builder.css`).
export const brandPrimaryButtonStyle = {
  "--button-bg": "var(--brand-primary)",
  "--button-bg-hover": "color-mix(in srgb, var(--brand-primary) 90%, black)",
  "--button-bg-pressed": "color-mix(in srgb, var(--brand-primary) 82%, black)",
  "--button-fg": "var(--brand-primary-foreground)",
} as CSSProperties;
