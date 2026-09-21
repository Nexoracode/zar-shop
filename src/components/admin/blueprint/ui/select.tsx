"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent, type ReactNode, type SelectHTMLAttributes } from "react";
import { BpFieldMessage, BpRequiredMark, describedBy } from "./field-message";
import { BpPopover } from "./popover";

export type BpSelectOption = { value: string; label: string; disabled?: boolean };

type BpSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "className" | "children"> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** Keep the message line even when empty. Off only for controls outside a form. */
  reserveMessage?: boolean;
  options: BpSelectOption[];
  placeholder?: string;
  className?: string;
  wrapperClassName?: string;
};

/** The narrowest the open list gets, so a compact select still shows its choices in full. */
const MIN_LIST_WIDTH = 144;

type Item = BpSelectOption & { isPlaceholder: boolean };

/**
 * A select whose list is drawn by the design system instead of the browser.
 *
 * The browser's own drop-down cannot be styled, so the visible control is a button plus a list of
 * options in a popover (the same look as the combobox lists). A real `<select>` stays in the page,
 * invisible, and is still what carries `name`, `value`, `required` and `onChange`: picking an option
 * sets it and fires its native `change` event, so every caller — controlled or not, in a form or out
 * of one — keeps reading `event.target.value` exactly as before. Focusing that hidden select (a
 * label click, "focus the first invalid field") moves focus to the visible button.
 */
export function BpSelect({ label, hint, error, reserveMessage = true, options, placeholder, className = "", wrapperClassName = "", id, required, disabled, title, "aria-label": ariaLabel, onFocus, ...rest }: BpSelectProps) {
  const generated = useId();
  const selectId = id ?? generated;
  const messageId = `${selectId}-message`;
  const labelId = `${selectId}-label`;
  const listId = `${selectId}-list`;
  const selectRef = useRef<HTMLSelectElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [listWidth, setListWidth] = useState(MIN_LIST_WIDTH);

  const items = useMemo<Item[]>(
    () => [...(placeholder ? [{ value: "", label: placeholder, isPlaceholder: true }] : []), ...options.map((option) => ({ ...option, isPlaceholder: false }))],
    [placeholder, options],
  );

  // What the button shows is read back from the hidden select after every commit, so it is right
  // whether the value is controlled, uncontrolled, or changed from outside.
  const [shown, setShown] = useState(() => String(rest.value ?? rest.defaultValue ?? (placeholder ? "" : options[0]?.value ?? "")));
  useLayoutEffect(() => {
    const current = selectRef.current?.value;
    if (current !== undefined) setShown((previous) => (previous === current ? previous : current));
  });

  const selectedIndex = items.findIndex((item) => item.value === shown);
  const selectedItem = items[selectedIndex] ?? (placeholder ? undefined : items[0]);
  const showingPlaceholder = Boolean(placeholder) && selectedItem?.isPlaceholder === true;

  function openList() {
    if (disabled) return;
    setListWidth(Math.max(MIN_LIST_WIDTH, triggerRef.current?.offsetWidth ?? 0));
    const start = selectedIndex >= 0 && !items[selectedIndex].disabled ? selectedIndex : items.findIndex((item) => !item.disabled);
    setActive(Math.max(0, start));
    setOpen(true);
  }

  function choose(next: string) {
    const select = selectRef.current;
    if (select && select.value !== next) {
      // The native setter, not `select.value =`, so React sees the change like a user's pick.
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set?.call(select, next);
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    setOpen(false);
    triggerRef.current?.focus();
  }

  function step(from: number, direction: 1 | -1) {
    for (let index = from + direction; index >= 0 && index < items.length; index += direction) {
      if (!items[index].disabled) return index;
    }
    return from;
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (!open) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") { event.preventDefault(); openList(); }
      return;
    }
    if (event.key === "ArrowDown") { event.preventDefault(); setActive((index) => step(index, 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive((index) => step(index, -1)); }
    else if (event.key === "Home") { event.preventDefault(); setActive(step(-1, 1)); }
    else if (event.key === "End") { event.preventDefault(); setActive(step(items.length, -1)); }
    else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); const item = items[active]; if (item && !item.disabled) choose(item.value); }
    else if (event.key === "Tab") setOpen(false);
  }

  useEffect(() => {
    if (open) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, listId]);

  function forwardFocus(event: FocusEvent<HTMLSelectElement>) {
    onFocus?.(event);
    triggerRef.current?.focus();
  }

  return (
    <div className={`bp-field ${wrapperClassName}`.trim()}>
      {label && <label id={labelId} htmlFor={selectId}>{label}{required && <BpRequiredMark />}</label>}
      <div className="bp-select-wrap">
        <select
          ref={selectRef}
          id={selectId}
          required={required}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden
          className="bp-select-native"
          onFocus={forwardFocus}
          {...rest}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
        </select>
        <button
          ref={triggerRef}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={open ? `${listId}-${active}` : undefined}
          aria-label={label ? undefined : ariaLabel}
          aria-labelledby={label ? labelId : undefined}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(messageId, error, hint)}
          title={title}
          disabled={disabled}
          className={`bp-input bp-select-trigger ${className}`.trim()}
          onClick={() => (open ? setOpen(false) : openList())}
          onKeyDown={onKeyDown}
        >
          <span className={`min-w-0 flex-1 truncate ${showingPlaceholder ? "bp-select-placeholder" : ""}`.trim()}>{selectedItem?.label ?? ""}</span>
        </button>
        <ChevronDown size={15} aria-hidden />
      </div>

      <BpPopover open={open} anchorRef={triggerRef} onClose={() => setOpen(false)} label={ariaLabel ?? (typeof label === "string" ? label : "انتخاب گزینه")} width={listWidth} className="bp-listbox-panel">
        <ul id={listId} role="listbox" className="bp-listbox">
          {items.map((item, index) => (
            <li key={`${item.value}-${index}`} role="presentation">
              <button
                type="button"
                role="option"
                id={`${listId}-${index}`}
                tabIndex={-1}
                aria-selected={index === selectedIndex}
                data-active={index === active ? "true" : undefined}
                disabled={item.disabled}
                // Keeps focus on the select's button, so the keyboard keeps working after a hover.
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => { if (!item.disabled) setActive(index); }}
                onClick={() => choose(item.value)}
                className={`bp-option ${item.isPlaceholder ? "bp-option-muted" : ""}`.trim()}
              >
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {index === selectedIndex && <Check size={14} aria-hidden className="bp-option-check" />}
              </button>
            </li>
          ))}
        </ul>
      </BpPopover>

      <BpFieldMessage id={messageId} error={error} hint={hint} reserve={reserveMessage} />
    </div>
  );
}
