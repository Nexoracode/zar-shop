"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { BpFieldMessage, describedBy } from "./field-message";

type SharedFieldProps = {
  label?: ReactNode;
  /** Shown under the control whenever there is no error to show instead. */
  hint?: ReactNode;
  error?: ReactNode;
  /** Keep the message line even when empty. Off only for controls outside a form. */
  reserveMessage?: boolean;
  className?: string;
  wrapperClassName?: string;
};

type BpInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & SharedFieldProps;

export function BpInput({ label, hint, error, reserveMessage = true, className = "", wrapperClassName = "", id, ...rest }: BpInputProps) {
  const generated = useId();
  const inputId = id ?? generated;
  const messageId = `${inputId}-message`;
  return (
    <div className={`bp-field ${wrapperClassName}`.trim()}>
      {label && <label htmlFor={inputId}>{label}</label>}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(messageId, error, hint)}
        className={`bp-input ${className}`.trim()}
        {...rest}
      />
      <BpFieldMessage id={messageId} error={error} hint={hint} reserve={reserveMessage} />
    </div>
  );
}

type BpTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & SharedFieldProps;

export function BpTextarea({ label, hint, error, reserveMessage = true, className = "", wrapperClassName = "", id, ...rest }: BpTextareaProps) {
  const generated = useId();
  const inputId = id ?? generated;
  const messageId = `${inputId}-message`;
  const remaining = typeof rest.value === "string" && typeof rest.maxLength === "number" ? rest.maxLength - rest.value.length : null;
  // Only once the reader is close enough for it to matter; a counter at 5000 left is noise.
  const showCounter = remaining !== null && typeof rest.maxLength === "number" && remaining <= Math.min(50, Math.floor(rest.maxLength / 4));
  return (
    <div className={`bp-field ${wrapperClassName}`.trim()}>
      {label && <label htmlFor={inputId}>{label}</label>}
      <textarea
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(messageId, error, hint)}
        className={`bp-input ${className}`.trim()}
        {...rest}
      />
      <span className="flex items-start justify-between gap-2">
        <BpFieldMessage id={messageId} error={error} hint={hint} reserve={reserveMessage} />
        {showCounter && <span aria-live="polite" className={`bp-field-message shrink-0 ${remaining <= 0 ? "bp-field-message-error" : "bp-field-message-hint"}`}>{remaining.toLocaleString("fa-IR")} نویسه باقی مانده</span>}
      </span>
    </div>
  );
}
