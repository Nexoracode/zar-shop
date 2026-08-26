"use client";

import { useId, type ReactNode } from "react";
import { BpFieldMessage, BpRequiredMark, describedBy } from "./field-message";

const hexPattern = /^#[0-9a-fA-F]{6}$/;

/**
 * A labelled hex-colour field: the native swatch picker for a quick choice, a text box for
 * typing or pasting an exact code — both write the same value, so the two never disagree.
 */
export function BpColorField({ label, value, onChange, error, hint, required, maxLength, name, reserveMessage = true, wrapperClassName = "", id }: {
  label?: ReactNode;
  value: string;
  onChange: (hex: string) => void;
  error?: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  maxLength?: number;
  name?: string;
  /** Keep the message line even when empty. Off only for controls outside a form. */
  reserveMessage?: boolean;
  wrapperClassName?: string;
  id?: string;
}) {
  const generated = useId();
  const fieldId = id ?? generated;
  const messageId = `${fieldId}-message`;

  return (
    <div className={`bp-field ${wrapperClassName}`.trim()}>
      {label && <label htmlFor={fieldId}>{label}{required && <BpRequiredMark />}</label>}
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={typeof label === "string" ? `انتخاب ${label}` : "انتخاب رنگ"}
          value={hexPattern.test(value) ? value : "#000000"}
          className="bp-color-input shrink-0"
          onChange={(event) => onChange(event.target.value.toUpperCase())}
        />
        <input
          id={fieldId}
          name={name}
          dir="ltr"
          spellCheck={false}
          required={required}
          maxLength={maxLength}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(messageId, error, hint)}
          className="bp-input flex-1"
          placeholder="#C9A56A"
          onChange={(event) => onChange(event.target.value.toUpperCase())}
        />
      </div>
      <BpFieldMessage id={messageId} error={error} hint={hint} reserve={reserveMessage} />
    </div>
  );
}
