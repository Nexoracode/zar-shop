"use client";

import { useState } from "react";
import { ComboBox, Input, Label, ListBox, Select } from "@heroui/react";

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
  includeEmptyOption?: boolean;
  required?: boolean;
  disabled?: boolean;
  searchable?: boolean;
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
  includeEmptyOption = true,
  required,
  disabled,
  searchable = false,
  className = "",
  onValueChange,
}: Props) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const selectedValue = value ?? internalValue;
  const selectedKey = selectedValue || emptyKey;
  const normalizedOptions = !includeEmptyOption || options.some((option) => option.value === "")
    ? options
    : [{ value: "", label: placeholder }, ...options];

  function change(next: React.Key | React.Key[] | null) {
    const raw = Array.isArray(next) ? next[0] : next;
    const normalized = raw === emptyKey || raw == null ? "" : String(raw);
    if (value === undefined) setInternalValue(normalized);
    onValueChange?.(normalized);
  }

  if (searchable) {
    return (
      <div className={className}>
        <input type="hidden" name={name} value={selectedValue} />
        <ComboBox
          items={options}
          selectedKey={selectedValue || null}
          onSelectionChange={change}
          isRequired={required}
          isDisabled={disabled}
          variant="secondary"
          fullWidth
          aria-label={ariaLabel ?? label ?? name}
          menuTrigger="focus"
        >
          {label && <Label className="mb-1.5 text-xs font-bold text-slate-600">{label}</Label>}
          <ComboBox.InputGroup className="min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 shadow-none focus-within:border-[var(--brand-primary)] focus-within:ring-2 focus-within:ring-[var(--brand-primary)]/15">
            <Input placeholder={`جستجو و انتخاب ${label ?? "گزینه"}`} className="min-h-11 w-full border-0 bg-transparent px-0 text-sm outline-none" />
            <ComboBox.Trigger aria-label={`نمایش فهرست ${label ?? name}`} />
          </ComboBox.InputGroup>
          <ComboBox.Popover className="z-[180] max-h-80 overflow-hidden" dir="rtl">
            <ListBox items={options} className="max-h-72 overflow-y-auto p-1">
              {(option) => <ListBox.Item id={option.value} textValue={option.label} isDisabled={option.disabled}><Label>{option.label}</Label><ListBox.ItemIndicator /></ListBox.Item>}
            </ListBox>
          </ComboBox.Popover>
        </ComboBox>
      </div>
    );
  }

  return (
    <div className={className}>
      <input type="hidden" name={name} value={selectedValue} />
      <Select
        selectedKey={selectedKey}
        onSelectionChange={change}
        placeholder={placeholder}
        isRequired={required}
        isDisabled={disabled}
        variant="secondary"
        fullWidth
        aria-label={ariaLabel ?? label ?? name}
      >
        {label && <Label className="mb-1.5 text-xs font-bold text-slate-600">{label}</Label>}
        <Select.Trigger className="min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm shadow-none">
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover className="z-[180] max-h-80 overflow-hidden" dir="rtl">
          <ListBox className="max-h-72 overflow-y-auto">
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
