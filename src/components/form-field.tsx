"use client";

import { useId, type ReactNode } from "react";
import { Input, TextArea } from "@heroui/react";

/*
 * The shared form controls for the storefront, the account area and the classic admin template.
 * `src/components/admin/blueprint/ui` is the Blueprint template's counterpart: the two look
 * different but keep the same contract, so a form migrated between templates behaves the same.
 *
 * What every control here guarantees, per the form rules in AGENTS.md:
 *   - a red edge and `aria-invalid` while the field is in error
 *   - the message sitting directly under its own control, not only in a toast
 *   - one reserved message line, so an error appearing never moves the rest of the form
 *   - hint and error sharing that line — the error takes it over, the hint returns when it clears
 */

type FieldShellProps = {
  label?: ReactNode;
  /** Shown under the control whenever there is no error to show instead. */
  hint?: ReactNode;
  error?: ReactNode;
  /** Keep the message line even when empty. Off only for controls outside a form. */
  reserveMessage?: boolean;
  required?: boolean;
  className?: string;
};

export function FormField({ id, label, hint, error, reserveMessage = true, required, className = "", children }: FieldShellProps & { id: string; children: ReactNode }) {
  const messageId = `${id}-message`;
  return (
    <div className={className}>
      {label && (
        <label className="field-label" htmlFor={id}>
          {label}
          {required && <span aria-hidden className="text-[var(--danger)]"> *</span>}
        </label>
      )}
      {children}
      {(reserveMessage || error || hint) && (
        <span id={messageId} className={`field-message ${error ? "field-message-error" : "field-message-hint"}`}>
          {error ?? hint ?? ""}
        </span>
      )}
    </div>
  );
}

/** Props a control passes to its input so the message and the error state stay wired up. */
export function fieldControlProps(id: string, error?: ReactNode, hint?: ReactNode) {
  return {
    id,
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": error || hint ? `${id}-message` : undefined,
  };
}

type TextFieldProps = FieldShellProps
  & Omit<React.ComponentProps<typeof Input>, "className" | "id">
  & { id?: string; wrapperClassName?: string; controlClassName?: string };

export function TextField({ label, hint, error, reserveMessage, required, wrapperClassName = "", controlClassName = "", id, ...rest }: TextFieldProps) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <FormField id={fieldId} label={label} hint={hint} error={error} reserveMessage={reserveMessage} required={required} className={wrapperClassName}>
      <Input
        {...fieldControlProps(fieldId, error, hint)}
        required={required}
        fullWidth
        variant="secondary"
        className={`field-control ${controlClassName}`.trim()}
        {...rest}
      />
    </FormField>
  );
}

type TextAreaFieldProps = FieldShellProps
  & Omit<React.ComponentProps<typeof TextArea>, "className" | "id">
  & { id?: string; wrapperClassName?: string; controlClassName?: string };

export function TextAreaField({ label, hint, error, reserveMessage, required, wrapperClassName = "", controlClassName = "", id, ...rest }: TextAreaFieldProps) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <FormField id={fieldId} label={label} hint={hint} error={error} reserveMessage={reserveMessage} required={required} className={wrapperClassName}>
      <TextArea
        {...fieldControlProps(fieldId, error, hint)}
        required={required}
        variant="secondary"
        className={`field-control ${controlClassName}`.trim()}
        {...rest}
      />
    </FormField>
  );
}
