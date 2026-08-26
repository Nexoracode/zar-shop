"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
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

/** A point on the dial for a clock-face angle (0° = 12 o'clock, clockwise), in percent of the
 * dial's own box — usable directly as CSS `left`/`top` and, since the dial's SVG overlay shares
 * the same 0–100 viewBox, as SVG coordinates too. */
function clockPoint(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: 50 + radius * Math.sin(rad), y: 50 - radius * Math.cos(rad) };
}

/** The same clock-face angle a pointer position reads as, relative to the dial's own centre. */
function clockAngleFromPoint(clientX: number, clientY: number, rect: DOMRect) {
  const dx = clientX - (rect.left + rect.width / 2);
  const dy = clientY - (rect.top + rect.height / 2);
  const theta = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return theta < 0 ? theta + 360 : theta;
}

/**
 * The Android-style round dial: drag or tap a number, same as the system time picker. Twelve
 * spots either way — hours 1–12, or minutes in fives — with the reachable minute continuous
 * under a drag rather than snapped, so a value between two ticks is still just a drag away.
 */
function AnalogClock({ mode, hour12, minute, onHour12Change, onMinuteChange }: {
  mode: "hour" | "minute";
  hour12: number;
  minute: number;
  onHour12Change: (value: number) => void;
  onMinuteChange: (value: number) => void;
}) {
  const dialRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  function apply(clientX: number, clientY: number) {
    const rect = dialRef.current?.getBoundingClientRect();
    if (!rect) return;
    const theta = clockAngleFromPoint(clientX, clientY, rect);
    if (mode === "hour") onHour12Change(Math.round(theta / 30) % 12 || 12);
    else onMinuteChange(Math.round(theta / 6) % 60);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    draggingRef.current = true;
    dialRef.current?.setPointerCapture(event.pointerId);
    apply(event.clientX, event.clientY);
  }
  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (draggingRef.current) apply(event.clientX, event.clientY);
  }
  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    draggingRef.current = false;
    if (dialRef.current?.hasPointerCapture(event.pointerId)) dialRef.current.releasePointerCapture(event.pointerId);
  }

  const ticks = mode === "hour"
    ? Array.from({ length: 12 }, (_, index) => (index === 0 ? 12 : index))
    : Array.from({ length: 12 }, (_, index) => index * 5);
  const selected = mode === "hour" ? hour12 : Math.round(minute / 5) % 12 * 5;
  const handAngle = mode === "hour" ? (hour12 % 12) * 30 : minute * 6;
  const tip = clockPoint(handAngle, 38);

  return (
    <div
      ref={dialRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="relative mx-auto my-1 h-[190px] w-[190px] shrink-0 touch-none select-none rounded-full bg-[var(--bp-surface)]"
    >
      <svg viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full">
        <line x1={50} y1={50} x2={tip.x} y2={tip.y} stroke="var(--bp-accent)" strokeWidth={1.5} />
        <circle cx={50} cy={50} r={2} fill="var(--bp-accent)" />
      </svg>
      {ticks.map((value) => {
        const point = clockPoint(mode === "hour" ? (value % 12) * 30 : value * 6, 38);
        const isSelected = value === selected;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={isSelected}
            aria-label={mode === "hour" ? `ساعت ${value}` : `دقیقه ${value}`}
            onClick={() => (mode === "hour" ? onHour12Change(value) : onMinuteChange(value))}
            className={`absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[12px] ${isSelected ? "bg-[var(--bp-accent)] text-[var(--bp-bg)]" : "hover:bg-[var(--bp-hover)]"}`}
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
          >
            {toPersianDigits(String(value).padStart(2, "0"))}
          </button>
        );
      })}
    </div>
  );
}

/** "۱۴۰۶/۰۲/۰۳ — ۰۲:۲۰", or "" for `null` — the same reading the field's own trigger shows,
 * for a caller that displays a chosen instant outside the field itself. */
export function formatPersianDateTime(iso: string | null) {
  const parts = toPersianParts(iso);
  if (!parts) return "";
  const pad = (value: number) => toPersianDigits(String(value).padStart(2, "0"));
  return `${toPersianDigits(parts.year)}/${pad(parts.month)}/${pad(parts.day)} — ${pad(parts.hour)}:${pad(parts.minute)}`;
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
  // Opening always starts on the hour ring, same as the system picker — the reader sets the hour,
  // which jumps to minute on its own; reopening to fix just the minute is one tap away regardless.
  const [clockMode, setClockMode] = useState<"hour" | "minute">("hour");
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
    const height = panelRef.current?.offsetHeight || 460;
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
  // The dial only ever shows 1–12; ق.ظ/ب.ظ carries the half of the day the stored 24-hour value
  // is actually in.
  const hour12 = hour % 12 || 12;
  const isPM = hour >= 12;

  function pickDay(day: number) {
    onChange(persianToIso(view.year, view.month, day, hour, minute));
  }

  function setTime(nextHour: number, nextMinute: number) {
    const base = selected ?? { ...todayPersian() };
    onChange(persianToIso(base.year, base.month, base.day, nextHour, nextMinute));
  }

  function pickHour12(nextHour12: number, pm: boolean) {
    setTime(pm ? (nextHour12 % 12) + 12 : nextHour12 % 12, minute);
    // Same flow as the system picker: setting the hour hands control straight to the minute ring.
    setClockMode("minute");
  }

  /** ق.ظ/ب.ظ is a correction, not a hand-off — unlike picking the hour itself, it must not also
   * jump the dial to the minute ring. */
  function setPeriod(pm: boolean) {
    if (pm !== isPM) setTime(pm ? (hour12 % 12) + 12 : hour12 % 12, minute);
  }

  function shiftMonth(direction: -1 | 1) {
    setView((current) => {
      const month = current.month + direction;
      if (month < 1) return { ...current, year: current.year - 1, month: 12 };
      if (month > 12) return { ...current, year: current.year + 1, month: 1 };
      return { ...current, month };
    });
  }

  const display = formatPersianDateTime(value);

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
        onClick={() => { if (!open) { if (selected) setView(selected); setClockMode("hour"); } setOpen((current) => !current); }}
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

          <div className="mt-3 border-t border-[var(--bp-divider)] pt-3">
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center gap-1 text-[20px] font-bold">
                <button type="button" onClick={() => setClockMode("hour")} className={clockMode === "hour" ? "text-[var(--bp-accent)]" : "bp-muted"}>
                  {toPersianDigits(String(hour12).padStart(2, "0"))}
                </button>
                <span aria-hidden className="bp-muted">:</span>
                <button type="button" onClick={() => setClockMode("minute")} className={clockMode === "minute" ? "text-[var(--bp-accent)]" : "bp-muted"}>
                  {toPersianDigits(String(minute).padStart(2, "0"))}
                </button>
              </div>
              <div className="flex flex-col overflow-hidden rounded-[var(--bp-radius)] border border-[var(--bp-divider)] text-[11px]">
                <button type="button" aria-pressed={!isPM} onClick={() => setPeriod(false)} className={`px-2 py-1 ${!isPM ? "bg-[var(--bp-accent)] text-[var(--bp-bg)]" : "hover:bg-[var(--bp-hover)]"}`}>ق.ظ</button>
                <button type="button" aria-pressed={isPM} onClick={() => setPeriod(true)} className={`border-t border-[var(--bp-divider)] px-2 py-1 ${isPM ? "bg-[var(--bp-accent)] text-[var(--bp-bg)]" : "hover:bg-[var(--bp-hover)]"}`}>ب.ظ</button>
              </div>
            </div>

            <AnalogClock
              mode={clockMode}
              hour12={hour12}
              minute={minute}
              onHour12Change={(next) => pickHour12(next, isPM)}
              onMinuteChange={(next) => setTime(hour, next)}
            />

            <BpButton size="sm" variant="ghost" fullWidth onClick={() => { onChange(null); setOpen(false); }}>پاک کردن</BpButton>
          </div>
        </div>,
        document.body,
      )}

      <BpFieldMessage id={messageId} error={error} hint={hint} reserve={reserveMessage} />
    </div>
  );
}
