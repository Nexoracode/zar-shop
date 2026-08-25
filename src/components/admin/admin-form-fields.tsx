"use client";

import type { ChangeEvent, ReactNode } from "react";
import { useAdminTemplate } from "./template-context";
import { BpInput } from "./blueprint/ui/input";
import { BpSelect } from "./blueprint/ui/select";
import { TextField } from "@/components/form-field";
import { HeroSelectField } from "@/components/hero-select-field";

/**
 * A text field for the admin panel that follows the active template: the Blueprint control in
 * `BLUEPRINT`, the shared HeroUI control in `CLASSIC`. Both already guarantee the same form
 * behaviour — a red edge and `aria-invalid` on error, the message under its own control, and a
 * reserved message line so an error never shifts the layout — so callers write one field.
 */
export function AdminTextField({ label, hint, error, wrapperClassName = "", ...rest }: {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  wrapperClassName?: string;
  value?: string;
  type?: string;
  accept?: string;
  dir?: "rtl" | "ltr";
  placeholder?: string;
  maxLength?: number;
  inputMode?: "text" | "numeric" | "decimal" | "tel" | "email" | "url";
  required?: boolean;
  disabled?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const template = useAdminTemplate();
  if (template === "BLUEPRINT") {
    return <BpInput label={label} hint={hint} error={error} wrapperClassName={wrapperClassName} {...rest} />;
  }
  return <TextField label={label} hint={hint} error={error} wrapperClassName={wrapperClassName} {...rest} />;
}

/** The same idea for a dropdown: the Blueprint select in `BLUEPRINT`, the HeroUI one in `CLASSIC`. */
export function AdminSelectField({ name, label, ariaLabel, value, options, error, hint, wrapperClassName = "", placeholder, disabled, onValueChange }: {
  name: string;
  label?: ReactNode;
  ariaLabel?: string;
  value: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  error?: ReactNode;
  hint?: ReactNode;
  wrapperClassName?: string;
  placeholder?: string;
  disabled?: boolean;
  onValueChange: (value: string) => void;
}) {
  const template = useAdminTemplate();
  if (template === "BLUEPRINT") {
    return <BpSelect name={name} aria-label={ariaLabel ?? (typeof label === "string" ? label : undefined)} label={label} value={value} options={options} placeholder={placeholder} error={error} hint={hint} disabled={disabled} wrapperClassName={wrapperClassName} onChange={(event) => onValueChange(event.target.value)} />;
  }
  return <HeroSelectField name={name} label={typeof label === "string" ? label : undefined} ariaLabel={ariaLabel} value={value} options={options} placeholder={placeholder} includeEmptyOption={Boolean(placeholder)} error={typeof error === "string" ? error : undefined} disabled={disabled} className={wrapperClassName} onValueChange={onValueChange} />;
}
