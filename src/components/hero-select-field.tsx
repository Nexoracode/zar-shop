"use client";

import { useState } from "react";
import { Label, ListBox, Select } from "@heroui/react";

export type HeroSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type Props = {
  name: string;
  label?: string;
  ariaLabel?: string;
  options: HeroSelectOption[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  onValueChange?: (value: string) => void;
};

const emptyKey = "__hero_empty__";

export function HeroSelectField({
  name,
  label,
  ariaLabel,
  options,
  value,
  defaultValue = "",
  placeholder = "انتخاب کنید",
  required,
  className = "",
  onValueChange,
}: Props) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const selectedValue = value ?? internalValue;
  const selectedKey = selectedValue || emptyKey;
  const normalizedOptions = options.some((option) => option.value === "")
    ? options
    : [{ value: "", label: placeholder }, ...options];

  function change(next: React.Key | React.Key[] | null) {
    const raw = Array.isArray(next) ? next[0] : next;
    const normalized = raw === emptyKey || raw == null ? "" : String(raw);
    if (value === undefined) setInternalValue(normalized);
    onValueChange?.(normalized);
  }

  return (
    <div className={className}>
      <input type="hidden" name={name} value={selectedValue} />
      <Select
        value={selectedKey}
        onChange={change}
        placeholder={placeholder}
        isRequired={required}
        variant="secondary"
        fullWidth
        aria-label={ariaLabel ?? label ?? name}
      >
        {label && <Label className="mb-1.5 text-xs font-bold text-slate-600">{label}</Label>}
        <Select.Trigger className="min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm shadow-none">
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover className="z-[180]">
          <ListBox>
            {normalizedOptions.map((option) => {
              const id = option.value || emptyKey;
              return (
                <ListBox.Item key={id} id={id} textValue={option.label} isDisabled={option.disabled}>
                  <Label>{option.label}</Label>
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              );
            })}
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  );
}
