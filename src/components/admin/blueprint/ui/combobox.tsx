"use client";

import { useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Plus, Search } from "lucide-react";
import { includesNormalizedText } from "@/lib/text-search";
import { BpFieldMessage, BpRequiredMark, describedBy } from "./field-message";
import { BpPopover } from "./popover";
import { BpSpinner } from "./button";

export type BpComboboxOption = {
  value: string;
  label: string;
  /** Hex code — shown as a small swatch beside the label, e.g. for a colour value. */
  color?: string | null;
};

/**
 * A select you can type into. Built from a text input and a list of buttons rather than a combobox
 * library, which the Blueprint rules rule out for something this small.
 *
 * The input holds the query while the list is open and falls back to showing the selected label
 * once it closes, so the field always reads as the current choice when it is not being edited.
 */
export function BpCombobox({ label, value, onChange, options, placeholder = "جستجو یا انتخاب کنید", emptyLabel = "موردی پیدا نشد", hint, error, reserveMessage = true, required, name, className = "", wrapperClassName = "", onCreate, creating = false }: {
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
  /** Offered when the typed text matches nothing: a "+" beside the field and a row in the open
   * list, both creating a new option from the query instead of picking an existing one. */
  onCreate?: (query: string) => void;
  /** Shows a spinner in place of the "+" while the caller's create request is in flight. */
  creating?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const fieldId = useId();
  const messageId = `${fieldId}-message`;

  const selectedOption = options.find((option) => option.value === value);
  const selectedLabel = selectedOption?.label ?? "";
  const showSwatch = !open && Boolean(selectedOption?.color);
  const matches = useMemo(
    () => (query.trim() ? options.filter((option) => includesNormalizedText(option.label, query)) : options),
    [options, query],
  );
  const trimmedQuery = query.trim();
  const canCreate = Boolean(onCreate) && open && trimmedQuery.length > 0 && matches.length === 0;

  function choose(option: BpComboboxOption) {
    onChange(option.value);
    setQuery("");
    setOpen(false);
  }

  function create() {
    if (!onCreate || !trimmedQuery || creating) return;
    onCreate(trimmedQuery);
  }

  return (
    <div className={`bp-field ${wrapperClassName}`.trim()}>
      {label && <label htmlFor={fieldId}>{label}{required && <BpRequiredMark />}</label>}
      <div className="bp-select-wrap">
        {showSwatch && <span aria-hidden className="absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border border-[var(--bp-divider)]" style={{ background: selectedOption!.color! }} />}
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
          style={showSwatch ? { paddingInlineStart: 30 } : undefined}
          placeholder={placeholder}
          value={open ? query : selectedLabel}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
          onKeyDown={(event) => {
            if (event.key === "Escape") { setQuery(""); setOpen(false); }
            if (event.key !== "Enter" || !open) return;
            /*
             * Enter belongs to the list while it is open, never to the surrounding form —
             * otherwise picking a city submits the page instead. One match is unambiguous, so
             * it is chosen; anything else just keeps the submit from happening.
             */
            event.preventDefault();
            if (matches.length === 1) choose(matches[0]);
            else if (canCreate) create();
          }}
        />
        {canCreate ? (
          <button
            type="button"
            aria-label={`افزودن «${trimmedQuery}»`}
            disabled={creating}
            onClick={create}
            className="absolute end-[9px] top-1/2 grid h-[15px] w-[15px] -translate-y-1/2 place-items-center text-[var(--bp-accent)] hover:text-[var(--bp-accent-600)] disabled:opacity-50"
          >
            {creating ? <BpSpinner size={14} /> : <Plus size={15} aria-hidden />}
          </button>
        ) : open ? <Search size={15} aria-hidden /> : <ChevronDown size={15} aria-hidden />}
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
                className={`flex w-full items-center gap-2 border border-transparent px-3 py-2 text-start text-[13px] hover:bg-[var(--bp-hover)] ${option.value === value ? "bg-[var(--bp-accent-100)] text-[var(--bp-accent-800)]" : ""}`}
              >
                {option.color && <span aria-hidden className="h-3.5 w-3.5 shrink-0 rounded-full border border-[var(--bp-divider)]" style={{ background: option.color }} />}
                {option.label}
              </button>
            </li>
          )) : (
            <li>
              {canCreate ? (
                <button type="button" disabled={creating} onClick={create} className="flex w-full items-center gap-2 border border-transparent px-3 py-2 text-start text-[13px] text-[var(--bp-accent)] hover:bg-[var(--bp-hover)] disabled:opacity-50">
                  {creating ? <BpSpinner size={14} /> : <Plus size={14} aria-hidden />}افزودن «{trimmedQuery}»
                </button>
              ) : <span className="bp-muted block px-3 py-4 text-center text-[12px]">{emptyLabel}</span>}
            </li>
          )}
        </ul>
      </BpPopover>

      <BpFieldMessage id={messageId} error={error} hint={hint} reserve={reserveMessage} />
    </div>
  );
}
