"use client";

import { useId, useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button, Input } from "@heroui/react";
import { FormField, fieldControlProps, type FieldTone } from "@/components/form-field";

// Digikala-style show/hide toggle for password fields — a plain visibility switch, not a
// second factor, so a lightweight local state is enough (no form value changes).
export function PasswordInput({ className = "", ...props }: ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} dir="ltr" className={`${className} pl-10`} />
      <Button
        type="button"
        isIconOnly
        variant="ghost"
        aria-label={visible ? "پنهان‌کردن رمز عبور" : "نمایش رمز عبور"}
        onPress={() => setVisible((value) => !value)}
        className="absolute left-1 top-1/2 size-8 min-h-8 min-w-8 -translate-y-1/2 rounded-lg text-[#9a9fa8] hover:bg-transparent hover:text-[#4b5160]"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </Button>
    </div>
  );
}

/**
 * The password control inside the shared field shell — label, one reserved message line, red
 * edge on error. Forms use this rather than pairing `PasswordInput` with their own label markup.
 */
export function PasswordField({ tone = "default", label, hint, error, required, wrapperClassName = "", id, ...rest }: ComponentProps<typeof Input> & {
  tone?: FieldTone;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  wrapperClassName?: string;
}) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <FormField id={fieldId} tone={tone} label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
      <PasswordInput
        {...fieldControlProps(fieldId, error, hint)}
        required={required}
        fullWidth
        variant="secondary"
        className={`field-control ${tone === "auth" ? "field-control-auth" : ""}`.trim()}
        {...rest}
      />
    </FormField>
  );
}
