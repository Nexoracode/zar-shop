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
  controlClassName?: string;
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
  controlClassName = "",
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
      <div className={`min-w-0 ${className}`}>
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
          className="min-w-0"
        >
          {label && <Label className="mb-2 text-xs font-medium text-slate-600">{label}{required && <span className="mr-0.5 text-[var(--danger)]">*</span>}</Label>}
          <ComboBox.InputGroup className={`min-h-11 min-w-0 rounded-lg border border-slate-300 bg-white px-3.5 shadow-none focus-within:border-slate-400 focus-within:ring-0 ${controlClassName}`}>
            <Input dir="rtl" placeholder="" className="min-h-11 min-w-0 flex-1 border-0 bg-transparent px-0 pl-9 text-right text-sm outline-none" />
            <ComboBox.Trigger aria-label={`نمایش فهرست ${label ?? name}`} className="end-1 size-8 h-8 rounded-md p-0 pe-0 text-slate-600" />
          </ComboBox.InputGroup>
          <ComboBox.Popover offset={4} className="z-[180] w-[var(--trigger-width)] max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm" dir="rtl">
            <ListBox items={options} className="max-h-48 overflow-y-auto px-0 py-1 text-right">
              {(option) => <ListBox.Item id={option.value} textValue={option.label} isDisabled={option.disabled} className="min-h-8 rounded-md px-3 text-right"><Label className="min-w-0 flex-1 truncate">{option.label}</Label><ListBox.ItemIndicator /></ListBox.Item>}
            </ListBox>
          </ComboBox.Popover>
        </ComboBox>
      </div>
    );
  }

  return (
    <div className={`min-w-0 ${className}`}>
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
        {label && <Label className="mb-2 text-xs font-medium text-slate-600">{label}{required && <span className="mr-0.5 text-[var(--danger)]">*</span>}</Label>}
        <Select.Trigger className={`min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm shadow-none ${controlClassName}`}>
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
