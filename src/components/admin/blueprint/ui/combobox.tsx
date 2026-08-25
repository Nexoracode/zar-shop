"use client";

import { useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { includesNormalizedText } from "@/lib/text-search";
import { BpFieldMessage, describedBy } from "./field-message";
import { BpPopover } from "./popover";

export type BpComboboxOption = { value: string; label: string };

/**
 * A select you can type into. Built from a text input and a list of buttons rather than a combobox
 * library, which the Blueprint rules rule out for something this small.
 *
 * The input holds the query while the list is open and falls back to showing the selected label
 * once it closes, so the field always reads as the current choice when it is not being edited.
 */
export function BpCombobox({ label, value, onChange, options, placeholder = "جستجو یا انتخاب کنید", emptyLabel = "موردی پیدا نشد", hint, error, reserveMessage = true, required, name, className = "", wrapperClassName = "" }: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: BpComboboxOption[];
  placeholder?: string;
  emptyLabel?: string;
  hint?: string;
  error?: string;
  reserveMessage?: boolean;
  required?: boolean;
  name?: string;
  className?: string;
  wrapperClassName?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const fieldId = useId();
  const messageId = `${fieldId}-message`;

  const selectedLabel = options.find((option) => option.value === value)?.label ?? "";
  const matches = useMemo(
    () => (query.trim() ? options.filter((option) => includesNormalizedText(option.label, query)) : options),
    [options, query],
  );

  function choose(option: BpComboboxOption) {
    onChange(option.value);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className={`bp-field ${wrapperClassName}`.trim()}>
      {label && <label htmlFor={fieldId}>{label}{required && <span aria-hidden className="text-[var(--bp-danger)]"> *</span>}</label>}
      <div className="bp-select-wrap">
        <input
          ref={inputRef}
          id={fieldId}
          name={name}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={open}
          aria-controls={`${fieldId}-list`}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(messageId, error, hint)}
          className={`bp-input ${className}`.trim()}
          placeholder={placeholder}
          value={open ? query : selectedLabel}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
          onKeyDown={(event) => {
            if (event.key === "Escape") { setQuery(""); setOpen(false); }
            if (event.key === "Enter" && open && matches.length === 1) { event.preventDefault(); choose(matches[0]); }
          }}
        />
        {open ? <Search size={15} aria-hidden /> : <ChevronDown size={15} aria-hidden />}
      </div>

      <BpPopover open={open} anchorRef={inputRef} onClose={() => { setQuery(""); setOpen(false); }} label={label ?? "انتخاب گزینه"} width={320}>
        <ul id={`${fieldId}-list`} role="listbox" className="bp-scroll m-0 max-h-64 list-none overflow-y-auto p-0">
          {matches.length ? matches.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => choose(option)}
                className={`w-full border border-transparent px-3 py-2 text-start text-[13px] hover:bg-[var(--bp-hover)] ${option.value === value ? "bg-[var(--bp-accent-100)] text-[var(--bp-accent-800)]" : ""}`}
              >
                {option.label}
              </button>
            </li>
          )) : <li className="bp-muted px-3 py-4 text-center text-[12px]">{emptyLabel}</li>}
        </ul>
      </BpPopover>

      <BpFieldMessage id={messageId} error={error} hint={hint} reserve={reserveMessage} />
    </div>
  );
}
