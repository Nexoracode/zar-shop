"use client";

import { ChevronDown } from "lucide-react";
import { useId, type ReactNode, type SelectHTMLAttributes } from "react";
import { BpFieldMessage, BpRequiredMark, describedBy } from "./field-message";

export type BpSelectOption = { value: string; label: string; disabled?: boolean };

type BpSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "className" | "children"> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** Keep the message line even when empty. Off only for controls outside a form. */
  reserveMessage?: boolean;
  options: BpSelectOption[];
  placeholder?: string;
  className?: string;
  wrapperClassName?: string;
};

export function BpSelect({ label, hint, error, reserveMessage = true, options, placeholder, className = "", wrapperClassName = "", id, required, ...rest }: BpSelectProps) {
  const generated = useId();
  const selectId = id ?? generated;
  const messageId = `${selectId}-message`;
  return (
    <div className={`bp-field ${wrapperClassName}`.trim()}>
      {label && <label htmlFor={selectId}>{label}{required && <BpRequiredMark />}</label>}
      <div className="bp-select-wrap">
        <select
          id={selectId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(messageId, error, hint)}
          className={`bp-input ${className}`.trim()}
          {...rest}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
        </select>
        <ChevronDown size={15} aria-hidden />
      </div>
      <BpFieldMessage id={messageId} error={error} hint={hint} reserve={reserveMessage} />
    </div>
  );
}
