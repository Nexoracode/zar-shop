"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import AnalogTimePicker from "react-multi-date-picker/plugins/analog_time_picker";
import { CalendarDays, ChevronLeft } from "lucide-react";
import { BpButton } from "./button";
import { BpFieldMessage, BpRequiredMark, describedBy } from "./field-message";

/*
 * A Jalali date + time picker on top of react-multi-date-picker: the Persian calendar and the
 * analog clock face are both the package's, not hand-rolled — a native-elements version of the
 * clock turned out too fragile to keep, and using a maintained package for it won out over the
 * Blueprint rule against pulling one in. Its own CSS is re-skinned in admin-blueprint.css so it
 * reads as part of this template rather than the library's own look.
 *
 * Two steps, never both on screen together: a bare `Calendar` picks the day, then the same
 * `Calendar` — `disableDayPicker`, with the analog-clock plugin — picks the time. The value
 * crossing this component's own boundary is still a plain ISO string, so every caller stays
 * exactly as it was.
 */

function toDateObject(iso: string | null) {
  return new DateObject({ date: iso ? new Date(iso) : new Date(), calendar: persian, locale: persian_fa });
}

/** "۱۴۰۶/۰۲/۰۳ — ۰۲:۲۰", or "" for `null` — the same reading the field's own trigger shows, for
 * a caller that displays a chosen instant outside the field itself. */
export function formatPersianDateTime(iso: string | null) {
  if (!iso) return "";
  return toDateObject(iso).format("YYYY/MM/DD — HH:mm");
}

type Props = {
  label?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  hint?: string;
  error?: string;
  reserveMessage?: boolean;
  required?: boolean;
  isDisabled?: boolean;
  className?: string;
  /** Set on the trigger button so a caller can query it for focus, the same way `data-field`
   * works on a plain `BpInput` — this field has no `name` of its own to derive one from. */
  "data-field"?: string;
};

export function BpDateTimeField({ label, value, onChange, hint, error, reserveMessage = true, required = false, isDisabled = false, className = "", "data-field": dataField }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<{ top: number; left: number } | null>(null);
  // Opening always starts on the day step, same as the flow the store settled on — the reader
  // picks a date, which hands off to the time step on its own.
  const [step, setStep] = useState<"date" | "time">("date");
  const fieldId = `bp-datetime-${label ?? "field"}`;
  const messageId = `${fieldId}-message`;

  /*
   * The panel is rendered into `document.body` and positioned with `position: fixed`. An
   * absolutely positioned panel inside the field would extend the document's scrollable area
   * whenever it reached past the bottom of the page, which stretched the page downwards.
   */
  const reposition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    // Measured once the panel exists; the estimate only covers the very first frame. The panel
    // sizes itself to its own content (the calendar and the clock plugin are different widths),
    // so this reads the real box rather than assuming one fixed size.
    const width = Math.min(panelRef.current?.offsetWidth || 270, window.innerWidth - 16);
    const height = panelRef.current?.offsetHeight || 360;
    const openUpwards = rect.bottom + height > window.innerHeight && rect.top > height;
    const preferred = openUpwards ? rect.top - height - 4 : rect.bottom + 4;
    // Clamped to the viewport on both axes, so the panel is always fully reachable even when the
    // trigger itself sits near — or past — an edge.
    const top = Math.min(Math.max(8, preferred), Math.max(8, window.innerHeight - height - 8));
    // RTL: line the panel's end edge up with the trigger's.
    const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
    setPlacement({ top, left });
  }, []);

  // Runs twice on open: once with the estimated size, then again once the panel has rendered and
  // its real box is measurable.
  const awaitingMeasure = placement === null;
  useLayoutEffect(() => { if (open) reposition(); }, [open, reposition, awaitingMeasure, step]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if ((event.target as HTMLElement).closest?.("[data-bp-datetime-popover]")) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) { if (event.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, reposition]);

  function pickDate(next: DateObject) {
    // A fresh pick keeps whatever hour/minute was already set, so re-opening to fix just the
    // date does not silently reset a time the reader already chose.
    const base = value ? toDateObject(value) : next;
    onChange(new DateObject(next).set({ hour: base.hour, minute: base.minute }).toDate().toISOString());
    setStep("time");
  }

  function pickTime(next: DateObject) {
    onChange(next.toDate().toISOString());
  }

  const display = formatPersianDateTime(value);

  return (
    <div ref={rootRef} className={`bp-field relative ${className}`.trim()}>
      {label && <label htmlFor={fieldId}>{label}{required && <BpRequiredMark />}</label>}
      <button
        ref={triggerRef}
        type="button"
        id={fieldId}
        data-field={dataField}
        disabled={isDisabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-invalid={error ? "true" : undefined}
        aria-describedby={describedBy(messageId, error, hint)}
        onClick={() => { if (!open) setStep("date"); setOpen((current) => !current); }}
        className="bp-input flex items-center justify-between gap-2 text-start"
      >
        <span className={display ? "" : "text-[var(--bp-muted)]"}>{display || "انتخاب تاریخ و ساعت"}</span>
        <CalendarDays size={15} aria-hidden className="flex-none opacity-60" />
      </button>

      {open && placement && typeof document !== "undefined" && createPortal(
        <div
          ref={panelRef}
          dir="rtl"
          role="dialog"
          data-bp-datetime-popover
          aria-label={label ?? "انتخاب تاریخ و ساعت"}
          // `position` is set inline on purpose: `.bp-frame` declares `position: relative` from an
          // unlayered stylesheet, which outranks Tailwind's layered `fixed` utility.
          style={{ position: "fixed", top: placement.top, left: placement.left, zIndex: 140 }}
          className="bp-root bp-datetime-popover bp-frame bg-[var(--bp-bg)] p-2 shadow-[var(--bp-shadow-lg)]"
        >
          {step === "time" && (
            <button
              type="button"
              onClick={() => setStep("date")}
              className="bp-muted mb-1 flex items-center gap-1 px-1 pt-1 text-[12px] hover:text-[var(--bp-accent)]"
            >
              <ChevronLeft size={14} aria-hidden />
              {value ? toDateObject(value).format("YYYY/MM/DD") : ""} — ویرایش تاریخ
            </button>
          )}

          {step === "date" ? (
            <Calendar
              value={value ? toDateObject(value) : undefined}
              onChange={(next) => { if (next) pickDate(next); }}
              calendar={persian}
              locale={persian_fa}
              shadow={false}
            />
          ) : (
            <Calendar
              value={value ? toDateObject(value) : undefined}
              onChange={(next) => { if (next) pickTime(next); }}
              calendar={persian}
              locale={persian_fa}
              disableDayPicker
              shadow={false}
              plugins={[<AnalogTimePicker key="time" position="bottom" hideSeconds />]}
            />
          )}

          <BpButton size="sm" variant="ghost" fullWidth onClick={() => { onChange(null); setOpen(false); }}>پاک کردن</BpButton>
        </div>,
        document.body,
      )}

      <BpFieldMessage id={messageId} error={error} hint={hint} reserve={reserveMessage} />
    </div>
  );
}
