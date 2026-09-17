"use client";

import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { BpButton } from "@/components/admin/blueprint/ui/button";
import { BpSeg } from "@/components/admin/blueprint/ui/seg";
import { DEFAULT_REPORT_RANGE, REPORT_RANGES, REPORT_RANGE_LABELS, type ReportRange } from "@/modules/reports/report-range";

/** The chosen Jalali day as a Gregorian `YYYY-MM-DD` string — the shape the server parses. */
function toGregorianKey(value: DateObject | DateObject[] | null) {
  const date = Array.isArray(value) ? value[0] : value;
  if (!date) return null;
  const day = date.toDate();
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
}

function toDateObject(key: string | null) {
  if (!key) return undefined;
  return new DateObject({ date: new Date(`${key}T00:00:00`), calendar: persian, locale: persian_fa });
}

type Props = { range: ReportRange; from: string | null; to: string | null };

export function ReportsFilterBar({ range, from, to }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const custom = Boolean(from && to);

  const apply = useCallback((query: Record<string, string | null>) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) if (value) params.set(key, value);
    startTransition(() => router.replace(`/admin/reports${params.size ? `?${params.toString()}` : ""}`, { scroll: false }));
  }, [router]);

  return (
    <div className={`flex flex-col gap-3 border-b border-[var(--bp-divider)] p-3 sm:flex-row sm:flex-wrap sm:items-end ${isPending ? "opacity-70" : ""}`} aria-busy={isPending}>
      <div className="min-w-0">
        <span className="bp-label">بازه زمانی</span>
        <BpSeg
          label="بازه زمانی گزارش"
          options={REPORT_RANGES.map((value) => ({ value: value as string, label: REPORT_RANGE_LABELS[value] }))}
          value={custom ? "" : range}
          onChange={(value) => apply({ range: value })}
        />
      </div>

      <span aria-hidden className="mx-1 hidden h-9 w-px shrink-0 self-end bg-[var(--bp-divider)] sm:block" />

      <div className="flex flex-wrap items-end gap-2">
        <DateField
          label="از تاریخ"
          value={toDateObject(from)}
          maxDate={toDateObject(to)}
          onChange={(value) => apply({ from: toGregorianKey(value), to })}
          onClear={from ? () => apply({ to }) : undefined}
        />
        <DateField
          label="تا تاریخ"
          value={toDateObject(to)}
          minDate={toDateObject(from)}
          onChange={(value) => apply({ from, to: toGregorianKey(value) })}
          onClear={to ? () => apply({ from }) : undefined}
        />
        {(from || to) && (
          <BpButton size="sm" variant="ghost" onClick={() => apply({ range: DEFAULT_REPORT_RANGE })}>
            <X size={14} />حذف بازهٔ دلخواه
          </BpButton>
        )}
      </div>
    </div>
  );
}

function DateField({ label, value, minDate, maxDate, onChange, onClear }: {
  label: string;
  value: DateObject | undefined;
  minDate?: DateObject;
  maxDate?: DateObject;
  onChange: (value: DateObject | DateObject[] | null) => void;
  onClear?: () => void;
}) {
  return (
    <div className="w-full min-w-0 sm:w-40">
      <span className="bp-label">{label}</span>
      <div className="relative">
        <DatePicker
          value={value}
          minDate={minDate}
          maxDate={maxDate}
          onChange={onChange}
          calendar={persian}
          locale={persian_fa}
          calendarPosition="bottom-start"
          format="YYYY/MM/DD"
          editable={false}
          portal={false}
          inputClass="bp-input"
          containerClassName="bp-datetime-popover"
          containerStyle={{ width: "100%" }}
          placeholder="انتخاب تاریخ"
        />
        {onClear && (
          <button
            type="button"
            aria-label={`حذف ${label}`}
            onClick={(event) => { event.stopPropagation(); onClear(); }}
            className="absolute end-1 top-1/2 z-10 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full bg-[var(--bp-surface)] text-[var(--bp-muted)] hover:text-[var(--bp-accent)]"
          >
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
