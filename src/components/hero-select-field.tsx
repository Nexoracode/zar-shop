"use client";

import { useMemo, useState } from "react";
import { ComboBox, Input, Label, ListBox, Select, Spinner } from "@heroui/react";

import { includesNormalizedText } from "@/lib/text-search";

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
  error?: string;
  reserveErrorSpace?: boolean;
  /** Options are still being fetched: the control says so itself and refuses input meanwhile. */
  loading?: boolean;
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
  error,
  reserveErrorSpace = false,
  loading = false,
  searchable = false,
  className = "",
  controlClassName = "",
  onValueChange,
}: Props) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [searchText, setSearchText] = useState("");
  const selectedValue = value ?? internalValue;
  const selectedKey = selectedValue || emptyKey;
  const normalizedOptions = !includeEmptyOption || options.some((option) => option.value === "")
    ? options
    : [{ value: "", label: placeholder }, ...options];
  const filteredOptions = useMemo(
    () => searchText ? options.filter((option) => includesNormalizedText(option.label, searchText)) : options,
    [options, searchText],
  );

  function change(next: React.Key | React.Key[] | null) {
    const raw = Array.isArray(next) ? next[0] : next;
    const normalized = raw === emptyKey || raw == null ? "" : String(raw);
    if (normalized) setSearchText("");
    if (value === undefined) setInternalValue(normalized);
    onValueChange?.(normalized);
  }

  if (searchable) {
    return (
      <div className={`min-w-0 ${className}`}>
        <input type="hidden" name={name} value={selectedValue} />
        <ComboBox
          items={filteredOptions}
          defaultFilter={() => true}
          onInputChange={setSearchText}
          selectedKey={selectedValue || null}
          onSelectionChange={change}
          isRequired={required}
          isDisabled={disabled || loading}
          isInvalid={Boolean(error)}
          variant="secondary"
          fullWidth
          aria-label={ariaLabel ?? label ?? name}
          menuTrigger="focus"
          className="min-w-0"
        >
          {label && <Label className="mb-2 text-xs font-medium text-slate-600">{label}</Label>}
          <ComboBox.InputGroup className={`min-h-11 min-w-0 rounded-lg border bg-white px-3.5 shadow-none focus-within:ring-2 ${controlClassName} ${error ? "border-[var(--danger)] focus-within:border-[var(--danger)] focus-within:ring-[var(--danger)]/15" : "border-slate-300 focus-within:border-slate-400 focus-within:ring-0"}`}>
            <Input
              dir="rtl"
              placeholder={loading ? "در حال دریافت..." : ""}
              className="hero-combobox-input min-h-11 min-w-0 flex-1 border-0 bg-transparent px-0 pl-9 text-right text-sm outline-none"
              /*
               * react-aria commits the option the reader arrowed to, but when none is focused it
               * only closes the list and lets the key through — which submitted the form the
               * moment someone typed a city and pressed Enter. Enter is the list's key while the
               * reader is searching, so it never reaches the form; a single match is taken as the
               * answer, and with several the arrow keys still decide.
               */
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                if (filteredOptions.length === 1) change(filteredOptions[0].value);
              }}
            />
            {loading
              ? <span className="end-1 grid size-8 place-items-center"><Spinner size="sm" /></span>
              : <ComboBox.Trigger aria-label={`نمایش فهرست ${label ?? name}`} className="end-1 size-8 h-8 rounded-md p-0 pe-0 text-slate-600" />}
          </ComboBox.InputGroup>
          <ComboBox.Popover offset={4} className="z-[180] w-[var(--trigger-width)] max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm" dir="rtl">
            <ListBox className="max-h-48 overflow-y-auto px-0 py-1 text-right">
              {(option: HeroSelectOption) => <ListBox.Item id={option.value} textValue={option.label} isDisabled={option.disabled} className="min-h-8 rounded-md px-3 text-right"><Label className="min-w-0 flex-1 truncate">{option.label}</Label><ListBox.ItemIndicator /></ListBox.Item>}
            </ListBox>
          </ComboBox.Popover>
        </ComboBox>
        {(error || reserveErrorSpace) && <span role={error ? "alert" : undefined} aria-hidden={error ? undefined : true} className={`mt-1.5 block min-h-4 text-[11px] font-normal ${error ? "text-[var(--danger)]" : "invisible"}`}>{error ?? "بدون خطا"}</span>}
      </div>
    );
  }

  return (
    <div className={`min-w-0 ${className}`}>
      <input type="hidden" name={name} value={selectedValue} />
      <Select
        selectedKey={selectedKey}
        onSelectionChange={change}
        placeholder={loading ? "در حال دریافت..." : placeholder}
        isRequired={required}
        isDisabled={disabled || loading}
        isInvalid={Boolean(error)}
        variant="secondary"
        fullWidth
        aria-label={ariaLabel ?? label ?? name}
      >
        {label && <Label className="mb-2 text-xs font-medium text-slate-600">{label}</Label>}
        <Select.Trigger className={`min-h-11 rounded-xl border bg-white px-3.5 text-sm shadow-none ${controlClassName} ${error ? "border-[var(--danger)] ring-2 ring-[var(--danger)]/15" : "border-slate-200"}`}>
          <Select.Value />
          {loading ? <Spinner size="sm" /> : <Select.Indicator />}
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
      {(error || reserveErrorSpace) && <span role={error ? "alert" : undefined} aria-hidden={error ? undefined : true} className={`mt-1.5 block min-h-4 text-[11px] font-normal ${error ? "text-[var(--danger)]" : "invisible"}`}>{error ?? "بدون خطا"}</span>}
    </div>
  );
}
