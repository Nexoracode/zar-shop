import type { ReactNode } from "react";

/**
 * The single slot under a form control that holds either its error or its hint — never both.
 *
 * The slot keeps a reserved height, so a field does not grow when an error appears and the rest
 * of the form does not shift under the reader. `reserve` can be turned off for controls that sit
 * outside a form (list filters, a page-size picker) and can never carry an error.
 */
export function BpFieldMessage({ id, error, hint, reserve = true }: { id: string; error?: ReactNode; hint?: ReactNode; reserve?: boolean }) {
  if (!reserve && !error && !hint) return null;
  const content = error ?? hint ?? "";
  // The slot is clipped to its one reserved line in CSS, so a message longer than the field is
  // wide would otherwise wrap and grow the slot — the exact height jump this component exists to
  // prevent. The full text still reaches the reader through the native title tooltip.
  return (
    <span id={id} title={typeof content === "string" ? content : undefined} className={`bp-field-message ${error ? "bp-field-message-error" : "bp-field-message-hint"}`}>
      {content}
    </span>
  );
}

/** The asterisk on a required field's label. Shared so every control marks it the same way. */
export function BpRequiredMark() {
  return <span aria-hidden className="text-[var(--bp-danger)]"> *</span>;
}

/** The control is described by its message only when one is actually being shown. */
export function describedBy(id: string, error?: ReactNode, hint?: ReactNode) {
  return error || hint ? id : undefined;
}
