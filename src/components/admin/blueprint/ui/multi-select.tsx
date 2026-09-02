"use client";

import { useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Plus, Search, X } from "lucide-react";
import { includesNormalizedText, normalizeSearchText } from "@/lib/text-search";
import { BpFieldMessage, BpRequiredMark, describedBy } from "./field-message";
import { BpPopover } from "./popover";

export type BpMultiSelectToken = {
  /** Stable identity of the chosen token — passed back to `onRemove`. */
  value: string;
  label: string;
  /** Hex — shown as a swatch on the chip and the matching list row. */
  color?: string | null;
  /** The option's own value when this token came from `options`; lets that option drop out of the list. */
  optionValue?: string;
};

export type BpMultiSelectOption = { value: string; label: string; color?: string | null };

/**
 * A select that holds several values at once, shown as removable chips inside the field. The list
 * opens in a popover on click — never inline under the field — and stays open across picks so a
 * run of values can be added in one go. With `onCreate` the typed query becomes new free tokens,
 * split on either comma so several can be entered together.
 */
export function BpMultiSelect({
  label,
  "aria-label": ariaLabel,
  required,
  name,
  tokens,
  options,
  onAdd,
  onRemove,
  onCreate,
  maxLength,
  placeholder = "برای انتخاب کلیک کنید",
  searchPlaceholder = "جستجو…",
  emptyLabel = "موردی برای انتخاب نیست",
  createHint,
  hint,
  error,
  reserveMessage = true,
  wrapperClassName = "",
}: {
  label?: string;
  "aria-label"?: string;
  required?: boolean;
  name?: string;
  tokens: BpMultiSelectToken[];
  options: BpMultiSelectOption[];
  onAdd: (optionValue: string) => void;
  onRemove: (tokenValue: string) => void;
  /** Free-text entry: receives the query already split on comma, trimmed and de-duped. */
  onCreate?: (labels: string[]) => void;
  maxLength?: number;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  createHint?: string;
  hint?: string;
  error?: string;
  reserveMessage?: boolean;
  wrapperClassName?: string;
}) {
  const fieldId = useId();
  const messageId = `${fieldId}-message`;
  const boxRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const pickedOptionValues = new Set(tokens.map((token) => token.optionValue).filter((value): value is string => Boolean(value)));
  const pickedLabels = new Set(tokens.map((token) => normalizeSearchText(token.label)));
  const available = options.filter((option) => !pickedOptionValues.has(option.value));
  const matches = useMemo(
    () => (query.trim() ? available.filter((option) => includesNormalizedText(option.label, query)) : available),
    [available, query],
  );

  const trimmed = query.trim();
  const createLabels = onCreate && trimmed
    ? [...new Set(trimmed.split(/[,،]/).map((piece) => piece.trim()).filter(Boolean))]
        .filter((entry) => (!maxLength || entry.length <= maxLength) && !pickedLabels.has(normalizeSearchText(entry)))
    : [];
  const canCreate = createLabels.length > 0;

  function commitCreate() {
    if (!onCreate || !canCreate) return;
    onCreate(createLabels);
    setQuery("");
  }

  function close() {
    setQuery("");
    setOpen(false);
  }

  return (
    <div className={`bp-field ${wrapperClassName}`.trim()}>
      {label && <label htmlFor={fieldId}>{label}{required && <BpRequiredMark />}</label>}
      <div className="bp-select-wrap">
        <div
          ref={boxRef}
          id={fieldId}
          data-field={name}
          role="combobox"
          tabIndex={0}
          aria-haspopup="listbox"
          aria-controls={`${fieldId}-list`}
          aria-expanded={open}
          aria-label={label ? undefined : ariaLabel}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(messageId, error, hint)}
          onClick={() => setOpen((value) => !value)}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setOpen((value) => !value); } }}
          className="bp-input bp-input-multi flex flex-wrap items-center gap-1.5"
        >
          {tokens.length === 0 && <span className="bp-muted">{placeholder}</span>}
          {tokens.map((token) => (
            <span key={token.value} className="bp-tag bp-tag-neutral inline-flex items-center gap-1.5">
              {token.color && <span aria-hidden className="h-3 w-3 shrink-0 rounded-full border border-[var(--bp-divider)]" style={{ background: token.color }} />}
              <span className="max-w-[160px] truncate">{token.label}</span>
              <button
                type="button"
                aria-label={`حذف ${token.label}`}
                onClick={(event) => { event.stopPropagation(); onRemove(token.value); }}
                className="grid h-3.5 w-3.5 place-items-center text-[var(--bp-muted)] hover:text-[var(--bp-danger)]"
              >
                <X size={11} aria-hidden />
              </button>
            </span>
          ))}
        </div>
        <ChevronDown size={15} aria-hidden />
      </div>

      <BpPopover open={open} anchorRef={boxRef} onClose={close} label={label ?? ariaLabel ?? "انتخاب"} width={320}>
        <div className="relative mb-2">
          <Search size={15} aria-hidden className="pointer-events-none absolute start-2.5 top-1/2 z-10 -translate-y-1/2 text-[var(--bp-muted)]" />
          <input
            autoFocus
            type="text"
            value={query}
            maxLength={onCreate ? undefined : maxLength}
            placeholder={searchPlaceholder}
            className="bp-input bp-input-search"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              if (canCreate) commitCreate();
              else if (matches.length === 1) { onAdd(matches[0].value); setQuery(""); }
            }}
          />
        </div>
        {createHint && onCreate ? <p className="bp-muted m-0 mb-2 text-[11px]">{createHint}</p> : null}
        <ul id={`${fieldId}-list`} role="listbox" aria-multiselectable className="bp-scroll m-0 max-h-56 list-none overflow-y-auto p-0">
          {canCreate ? (
            <li>
              <button type="button" onClick={commitCreate} className="flex w-full items-center gap-2 border border-transparent px-3 py-2 text-start text-[13px] text-[var(--bp-accent)] hover:bg-[var(--bp-hover)]">
                <Plus size={14} aria-hidden />
                {createLabels.length > 1 ? `افزودن ${createLabels.length.toLocaleString("fa-IR")} مقدار` : `افزودن «${createLabels[0]}»`}
              </button>
            </li>
          ) : null}
          {matches.map((option) => (
            <li key={option.value}>
              <button type="button" onClick={() => { onAdd(option.value); setQuery(""); }} className="flex w-full items-center gap-2 border border-transparent px-3 py-2 text-start text-[13px] hover:bg-[var(--bp-hover)]">
                {option.color ? <span aria-hidden className="h-3.5 w-3.5 shrink-0 rounded-full border border-[var(--bp-divider)]" style={{ background: option.color }} /> : null}
                {option.label}
              </button>
            </li>
          ))}
          {matches.length === 0 && !canCreate ? (
            <li><span className="bp-muted block px-3 py-4 text-center text-[12px]">{onCreate && !trimmed ? "برای افزودن، نام مقدار را بنویسید." : emptyLabel}</span></li>
          ) : null}
        </ul>
      </BpPopover>

      <BpFieldMessage id={messageId} error={error} hint={hint} reserve={reserveMessage} />
    </div>
  );
}
