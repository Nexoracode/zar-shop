"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { BpSpinner } from "./button";
import { BpFieldMessage, BpRequiredMark, describedBy } from "./field-message";
import { BpPopover } from "./popover";
import { useDebounced } from "./use-debounced";

export type BpAsyncMultiSelectHit = { id: string };

export type BpAsyncMultiSelectToken = { value: string; label: string; hint?: string };

/**
 * Same chips-in-field + popover-list shell as {@link BpMultiSelect}, but the option list comes from a
 * remote `search` call instead of a static array. Used for pickers whose corpus is too large to ship
 * to the client (products, users). Chips carry their own label so a chosen row survives a later
 * search that no longer returns it.
 */
export function BpAsyncMultiSelect<Hit extends BpAsyncMultiSelectHit>({
  label,
  "aria-label": ariaLabel,
  required,
  tokens,
  onAdd,
  onRemove,
  search,
  renderHit,
  minChars = 3,
  name,
  placeholder = "برای انتخاب کلیک کنید",
  searchPlaceholder = "جستجو…",
  emptyLabel = "نتیجه‌ای پیدا نشد",
  hint,
  error,
  reserveMessage = true,
  wrapperClassName = "",
}: {
  label?: string;
  "aria-label"?: string;
  required?: boolean;
  tokens: BpAsyncMultiSelectToken[];
  onAdd: (hit: Hit) => void;
  onRemove: (tokenValue: string) => void;
  search: (query: string, signal: AbortSignal) => Promise<Hit[]>;
  renderHit: (hit: Hit) => { label: string; hint?: string };
  minChars?: number;
  name?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
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
  const [results, setResults] = useState<{ query: string; hits: Hit[] }>({ query: "", hits: [] });
  const trimmed = query.trim();
  const debounced = useDebounced(trimmed, 350);
  const ready = debounced.length >= minChars;

  useEffect(() => {
    if (!open || !ready) return;
    const controller = new AbortController();
    search(debounced, controller.signal)
      .then((hits) => { if (!controller.signal.aborted) setResults({ query: debounced, hits }); })
      .catch(() => { if (!controller.signal.aborted) setResults({ query: debounced, hits: [] }); });
    return () => controller.abort();
  }, [open, ready, debounced, search]);

  const picked = new Set(tokens.map((token) => token.value));
  const settled = ready && results.query === debounced;
  const loading = ready && results.query !== debounced;
  // Only trust results that belong to the query currently in the box.
  const matches = settled ? results.hits.filter((hit) => !picked.has(hit.id)) : [];

  function close() {
    setQuery("");
    setResults({ query: "", hits: [] });
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
              <span className="max-w-[180px] truncate">{token.label}</span>
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

      <BpPopover open={open} anchorRef={boxRef} onClose={close} label={label ?? ariaLabel ?? "انتخاب"} width={340}>
        <div className="relative mb-2">
          <Search size={15} aria-hidden className="pointer-events-none absolute start-2.5 top-1/2 z-10 -translate-y-1/2 text-[var(--bp-muted)]" />
          <input
            autoFocus
            type="text"
            value={query}
            placeholder={searchPlaceholder}
            className="bp-input bp-input-search"
            onChange={(event) => setQuery(event.target.value)}
          />
          {loading && <span className="absolute end-2.5 top-1/2 -translate-y-1/2 text-[var(--bp-accent)]"><BpSpinner size={14} /></span>}
        </div>
        <ul id={`${fieldId}-list`} role="listbox" aria-multiselectable className="bp-scroll m-0 max-h-56 list-none overflow-y-auto p-0">
          {matches.map((hit) => {
            const view = renderHit(hit);
            return (
              <li key={hit.id}>
                <button
                  type="button"
                  onClick={() => { onAdd(hit); setQuery(""); }}
                  className="flex w-full items-center justify-between gap-2 border border-transparent px-3 py-2 text-start text-[13px] hover:bg-[var(--bp-hover)]"
                >
                  <span className="min-w-0 truncate">{view.label}</span>
                  {view.hint ? <span dir="ltr" className="bp-muted shrink-0 text-[11px]">{view.hint}</span> : null}
                </button>
              </li>
            );
          })}
          {settled && matches.length === 0 ? (
            <li><span className="bp-muted block px-3 py-4 text-center text-[12px]">{emptyLabel}</span></li>
          ) : null}
          {!ready ? (
            <li><span className="bp-muted block px-3 py-4 text-center text-[12px]">برای جستجو دست‌کم {minChars.toLocaleString("fa-IR")} نویسه بنویسید.</span></li>
          ) : null}
        </ul>
      </BpPopover>

      <BpFieldMessage id={messageId} error={error} hint={hint} reserve={reserveMessage} />
    </div>
  );
}
