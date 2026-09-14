"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { BpFieldMessage, BpRequiredMark, describedBy } from "./field-message";

/**
 * Free-text chip input for labels with no backing corpus to search (unlike {@link BpAsyncMultiSelect}) —
 * type a value, commit it with Enter or a comma, remove a chip with its ×.
 */
export function BpTagInput({
  label,
  hint,
  error,
  reserveMessage = true,
  required,
  tags,
  onChange,
  placeholder = "افزودن برچسب…",
  maxTagLength,
  wrapperClassName = "",
}: {
  label?: string;
  hint?: string;
  error?: string;
  reserveMessage?: boolean;
  required?: boolean;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTagLength?: number;
  wrapperClassName?: string;
}) {
  const fieldId = useId();
  const messageId = `${fieldId}-message`;
  const [draft, setDraft] = useState("");

  function commit() {
    const value = draft.trim();
    setDraft("");
    if (!value || tags.includes(value)) return;
    onChange([...tags, value]);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit();
    } else if (event.key === "Backspace" && !draft && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div className={`bp-field ${wrapperClassName}`.trim()}>
      {label && <label htmlFor={fieldId}>{label}{required && <BpRequiredMark />}</label>}
      <div className="bp-input bp-input-multi flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <span key={tag} className="bp-tag bp-tag-neutral inline-flex items-center gap-1.5">
            <span className="max-w-[160px] truncate">{tag}</span>
            <button type="button" aria-label={`حذف ${tag}`} onClick={() => onChange(tags.filter((item) => item !== tag))} className="grid h-3.5 w-3.5 place-items-center text-[var(--bp-muted)] hover:text-[var(--bp-danger)]">
              <X size={11} aria-hidden />
            </button>
          </span>
        ))}
        <input
          id={fieldId}
          type="text"
          value={draft}
          maxLength={maxTagLength}
          placeholder={tags.length === 0 ? placeholder : ""}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(messageId, error, hint)}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          className="min-w-[100px] flex-1 border-none bg-transparent p-0 text-[13px] outline-none"
        />
      </div>
      <BpFieldMessage id={messageId} error={error} hint={hint} reserve={reserveMessage} />
    </div>
  );
}
