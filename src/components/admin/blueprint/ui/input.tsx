"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";

type FieldWrapProps = { label?: ReactNode; hint?: ReactNode; error?: ReactNode; htmlFor: string; className?: string; children: ReactNode };

function FieldWrap({ label, hint, error, htmlFor, className = "", children }: FieldWrapProps) {
  return (
    <div className={`bp-field ${className}`.trim()}>
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
      {hint && !error && <span className="bp-muted mt-1 block text-[11px] leading-5">{hint}</span>}
      {error && <span className="mt-1 block text-[11px] leading-5 text-[var(--bp-danger)]">{error}</span>}
    </div>
  );
}

type BpInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  wrapperClassName?: string;
};

export function BpInput({ label, hint, error, className = "", wrapperClassName, id, ...rest }: BpInputProps) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <FieldWrap label={label} hint={hint} error={error} htmlFor={inputId} className={wrapperClassName}>
      <input id={inputId} aria-invalid={error ? true : undefined} className={`bp-input ${className}`.trim()} {...rest} />
    </FieldWrap>
  );
}

type BpTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  wrapperClassName?: string;
};

export function BpTextarea({ label, hint, error, className = "", wrapperClassName, id, ...rest }: BpTextareaProps) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <FieldWrap label={label} hint={hint} error={error} htmlFor={inputId} className={wrapperClassName}>
      <textarea id={inputId} aria-invalid={error ? true : undefined} className={`bp-input ${className}`.trim()} {...rest} />
    </FieldWrap>
  );
}
