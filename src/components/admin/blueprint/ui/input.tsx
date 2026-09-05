"use client";

import { useId, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { BpFieldMessage, BpRequiredMark, describedBy } from "./field-message";

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

type BpInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "type"> & SharedFieldProps & {
  /**
   * Renders as a password field with its own show/hide toggle instead of the caller wiring one
   * up by hand — every credential field (API key, gateway id) needs the exact same control, so
   * the visibility state and the toggle button live here once instead of being copy-pasted.
   */
  secret?: boolean;
  type?: InputHTMLAttributes<HTMLInputElement>["type"];
};

export function BpInput({ label, hint, error, reserveMessage = true, className = "", wrapperClassName = "", id, required, secret = false, type, ...rest }: BpInputProps) {
  const generated = useId();
  const inputId = id ?? generated;
  const messageId = `${inputId}-message`;
  const [visible, setVisible] = useState(false);
  return (
    <div className={`bp-field ${wrapperClassName}`.trim()}>
      {label && <label htmlFor={inputId}>{label}{required && <BpRequiredMark />}</label>}
      <div className={secret ? "bp-select-wrap" : undefined}>
        <input
          id={inputId}
          type={secret ? (visible ? "text" : "password") : type}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(messageId, error, hint)}
          className={`bp-input ${secret ? "bp-input-secret" : ""} ${className}`.trim()}
          {...rest}
        />
        {secret && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? "پنهان‌کردن مقدار" : "نمایش مقدار"}
            className="bp-input-secret-toggle"
          >
            {visible ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
      <BpFieldMessage id={messageId} error={error} hint={hint} reserve={reserveMessage} />
    </div>
  );
}

type BpTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & SharedFieldProps;

export function BpTextarea({ label, hint, error, reserveMessage = true, className = "", wrapperClassName = "", id, required, ...rest }: BpTextareaProps) {
  const generated = useId();
  const inputId = id ?? generated;
  const messageId = `${inputId}-message`;
  const remaining = typeof rest.value === "string" && typeof rest.maxLength === "number" ? rest.maxLength - rest.value.length : null;
  // Only once the reader is close enough for it to matter; a counter at 5000 left is noise.
  const showCounter = remaining !== null && typeof rest.maxLength === "number" && remaining <= Math.min(50, Math.floor(rest.maxLength / 4));
  return (
    <div className={`bp-field ${wrapperClassName}`.trim()}>
      {label && <label htmlFor={inputId}>{label}{required && <BpRequiredMark />}</label>}
      <textarea
        id={inputId}
        required={required}
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
