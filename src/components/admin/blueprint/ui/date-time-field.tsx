"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDateTime, GregorianCalendar, PersianCalendar, toCalendar } from "@internationalized/date";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { BpButton } from "./button";
import { BpFieldMessage, describedBy } from "./field-message";
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
  isDisabled?: boolean;
  className?: string;
};

export function BpDateTimeField({ label, value, onChange, hint, error, reserveMessage = true, isDisabled = false, className = "" }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => toPersianParts(value), [value]);
  const [view, setView] = useState(() => selected ?? todayPersian());
  const fieldId = `bp-datetime-${label ?? "field"}`;
  const messageId = `${fieldId}-message`;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) { if (event.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

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
      {label && <label htmlFor={fieldId}>{label}</label>}
      <button
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

      {open && (
        <div dir="rtl" role="dialog" aria-label={label ?? "انتخاب تاریخ و ساعت"} className="bp-frame absolute z-50 mt-1 w-[min(92vw,290px)] bg-[var(--bp-bg)] p-3 shadow-[var(--bp-shadow-lg)]">
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
        </div>
      )}

      <BpFieldMessage id={messageId} error={error} hint={hint} reserve={reserveMessage} />
    </div>
  );
}
