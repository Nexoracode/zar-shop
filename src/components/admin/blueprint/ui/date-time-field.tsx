"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDateTime, GregorianCalendar, PersianCalendar, toCalendar } from "@internationalized/date";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { BpButton } from "./button";
import { BpFieldMessage, BpRequiredMark, describedBy } from "./field-message";
import { toPersianDigits } from "@/lib/persian-numbers";

/*
 * A Jalali date + time picker built on native elements — a grid of buttons and two number
 * inputs. The Blueprint rules forbid pulling in a heavy picker component, and the only thing
 * actually hard here (Gregorian ↔ Persian conversion) is already handled by
 * `@internationalized/date`, which the project depends on.
 *
 * The value crossing the boundary is always an ISO string, so callers and the server never deal
 * with the Persian calendar at all.
 */

const persian = new PersianCalendar();
const weekdayLabels = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
const persianMonths = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

function toPersianParts(iso: string | null) {
  const date = iso ? new Date(iso) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  const gregorian = new CalendarDateTime(date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes());
  const jalali = toCalendar(gregorian, persian);
  return { year: jalali.year, month: jalali.month, day: jalali.day, hour: date.getHours(), minute: date.getMinutes() };
}

function persianToIso(year: number, month: number, day: number, hour: number, minute: number) {
  const jalali = new CalendarDateTime(persian, year, month, day, hour, minute);
  const gregorian = toCalendar(jalali, new GregorianCalendar());
  // Built in local time, so the instant stored matches the wall clock the reader picked.
  return new Date(gregorian.year, gregorian.month - 1, gregorian.day, hour, minute).toISOString();
}

/** Days in a Persian month, via the calendar itself rather than a hand-written leap-year rule. */
function daysInPersianMonth(year: number, month: number) {
  return persian.getDaysInMonth(new CalendarDateTime(persian, year, month, 1, 0, 0));
}

/** Weekday index with Saturday as 0, matching the Iranian week. */
function persianMonthStartOffset(year: number, month: number) {
  const first = new CalendarDateTime(persian, year, month, 1, 0, 0);
  const jsDay = first.toDate("UTC").getUTCDay(); // 0 = Sunday
  return (jsDay + 1) % 7;
}

function todayPersian() {
  const now = new Date();
  return toPersianParts(now.toISOString())!;
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
};

export function BpDateTimeField({ label, value, onChange, hint, error, reserveMessage = true, required = false, isDisabled = false, className = "" }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<{ top: number; left: number } | null>(null);
  const selected = useMemo(() => toPersianParts(value), [value]);
  const [view, setView] = useState(() => selected ?? todayPersian());
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
    const width = Math.min(290, window.innerWidth - 16);
    // Measured once the panel exists; the estimate only covers the very first frame.
    const height = panelRef.current?.offsetHeight || 330;
    const openUpwards = rect.bottom + height > window.innerHeight && rect.top > height;
    const preferred = openUpwards ? rect.top - height - 4 : rect.bottom + 4;
    // Clamped to the viewport on both axes, so the panel is always fully reachable even when the
    // trigger itself sits near — or past — an edge.
    const top = Math.min(Math.max(8, preferred), Math.max(8, window.innerHeight - height - 8));
    // RTL: line the panel's end edge up with the trigger's.
    const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
    setPlacement({ top, left });
  }, []);

  // Runs twice on open: once with the estimated height, then again once the panel has rendered
  // and its real height is measurable.
  const awaitingMeasure = placement === null;
  useLayoutEffect(() => { if (open) reposition(); }, [open, reposition, awaitingMeasure]);

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

  const totalDays = daysInPersianMonth(view.year, view.month);
  const offset = persianMonthStartOffset(view.year, view.month);
  const hour = selected?.hour ?? 0;
  const minute = selected?.minute ?? 0;

  function pickDay(day: number) {
    onChange(persianToIso(view.year, view.month, day, hour, minute));
  }

  function setTime(nextHour: number, nextMinute: number) {
    const base = selected ?? { ...todayPersian() };
    onChange(persianToIso(base.year, base.month, base.day, nextHour, nextMinute));
  }

  function shiftMonth(direction: -1 | 1) {
    setView((current) => {
      const month = current.month + direction;
      if (month < 1) return { ...current, year: current.year - 1, month: 12 };
      if (month > 12) return { ...current, year: current.year + 1, month: 1 };
      return { ...current, month };
    });
  }

  // Every part goes through the same conversion, so the string is not half Persian digits and
  // half Latin.
  const pad = (value: number) => toPersianDigits(String(value).padStart(2, "0"));
  const display = selected
    ? `${toPersianDigits(selected.year)}/${pad(selected.month)}/${pad(selected.day)} — ${pad(selected.hour)}:${pad(selected.minute)}`
    : "";

  return (
    <div ref={rootRef} className={`bp-field relative ${className}`.trim()}>
      {label && <label htmlFor={fieldId}>{label}{required && <BpRequiredMark />}</label>}
      <button
        ref={triggerRef}
        type="button"
        id={fieldId}
        disabled={isDisabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-invalid={error ? "true" : undefined}
        aria-describedby={describedBy(messageId, error, hint)}
        onClick={() => { if (!open && selected) setView(selected); setOpen((current) => !current); }}
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
          className="bp-root bp-frame w-[min(92vw,290px)] bg-[var(--bp-bg)] p-3 shadow-[var(--bp-shadow-lg)]"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <BpButton isIconOnly size="sm" variant="ghost" aria-label="ماه قبل" onClick={() => shiftMonth(-1)}><ChevronRight size={15} /></BpButton>
            <strong className="text-[13px]">{persianMonths[view.month - 1]} {toPersianDigits(view.year)}</strong>
            <BpButton isIconOnly size="sm" variant="ghost" aria-label="ماه بعد" onClick={() => shiftMonth(1)}><ChevronLeft size={15} /></BpButton>
          </div>

          <div className="grid grid-cols-7 gap-px text-center">
            {weekdayLabels.map((day) => <span key={day} className="bp-muted py-1 text-[10px]">{day}</span>)}
            {Array.from({ length: offset }, (_, index) => <span key={`pad-${index}`} />)}
            {Array.from({ length: totalDays }, (_, index) => index + 1).map((day) => {
              const isSelected = selected?.year === view.year && selected?.month === view.month && selected?.day === day;
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => pickDay(day)}
                  className={`h-8 border text-[12px] ${isSelected ? "border-[var(--bp-accent)] bg-[var(--bp-accent)] text-[var(--bp-bg)]" : "border-transparent hover:bg-[var(--bp-hover)]"}`}
                >
                  {day.toLocaleString("fa-IR")}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center gap-2 border-t border-[var(--bp-divider)] pt-3">
            <span className="bp-muted text-[11px]">ساعت</span>
            <input type="number" min={0} max={23} value={hour} aria-label="ساعت" dir="ltr" onChange={(event) => setTime(Math.min(23, Math.max(0, Number(event.target.value))), minute)} className="bp-input w-14 text-center" />
            <span aria-hidden>:</span>
            <input type="number" min={0} max={59} value={minute} aria-label="دقیقه" dir="ltr" onChange={(event) => setTime(hour, Math.min(59, Math.max(0, Number(event.target.value))))} className="bp-input w-14 text-center" />
            <BpButton size="sm" variant="ghost" className="ms-auto" onClick={() => { onChange(null); setOpen(false); }}>پاک کردن</BpButton>
          </div>
        </div>,
        document.body,
      )}

      <BpFieldMessage id={messageId} error={error} hint={hint} reserve={reserveMessage} />
    </div>
  );
}
