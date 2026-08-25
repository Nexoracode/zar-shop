"use client";

import { DateField, DateRangePicker, Label, RangeCalendar } from "@heroui/react";
import { parseAbsolute, parseDate, toCalendarDateTime, type DateValue } from "@internationalized/date";
import { I18nProvider } from "react-aria-components";
import { ChevronLeft, ChevronRight } from "lucide-react";

const tehran = "Asia/Tehran";

type Props = {
  label: string;
  start: string | null;
  end: string | null;
  onChange: (range: { start: string; end: string } | null) => void;
  isDisabled?: boolean;
  /**
   * Adds hour and minute segments and switches the exchanged value from a bare `YYYY-MM-DD` to a
   * full ISO instant. Off by default: callers that mean whole days — promotions, for one — keep
   * sending dates, which the server still reads as midnight-to-midnight in Tehran.
   */
  withTime?: boolean;
};

export function HeroDateRangeField({ label, start, end, onChange, isDisabled = false, withTime = false }: Props) {
  function parse(value: string | null) {
    if (!value) return null;
    // A stored instant is read back on Tehran's clock, so the segments show the local time the
    // reader picked rather than UTC.
    return withTime ? toCalendarDateTime(parseAbsolute(value, tehran)) : parseDate(value);
  }

  function serialize(value: DateValue) {
    return withTime ? value.toDate(tehran).toISOString() : value.toString();
  }

  const parsedStart = start ? parse(start) : null;
  const parsedEnd = end ? parse(end) : null;
  const value = parsedStart && parsedEnd ? { start: parsedStart, end: parsedEnd } : null;

  return (
    <I18nProvider locale="fa-IR-u-ca-persian">
      <DateRangePicker<DateValue>
        value={value}
        granularity={withTime ? "minute" : "day"}
        onChange={(range) => onChange(range ? { start: serialize(range.start), end: serialize(range.end) } : null)}
        isDisabled={isDisabled}
        className="grid gap-1.5"
      >
        <Label className="text-xs font-bold text-slate-500">{label}</Label>
        <DateField.Group fullWidth variant="secondary" className="min-h-11 rounded-xl border border-slate-200 bg-white">
          <DateField.InputContainer className="min-w-0 flex-1 px-3">
            <DateField.Input slot="start" dir="ltr" className={`flex-1 justify-center [direction:ltr] ${withTime ? "min-w-[150px]" : "min-w-[104px]"}`}>
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
            <DateRangePicker.RangeSeparator className="px-1 text-slate-400">تا</DateRangePicker.RangeSeparator>
            <DateField.Input slot="end" dir="ltr" className={`flex-1 justify-center [direction:ltr] ${withTime ? "min-w-[150px]" : "min-w-[104px]"}`}>
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
          </DateField.InputContainer>
          <DateField.Suffix>
            <DateRangePicker.Trigger aria-label="باز کردن تقویم فارسی">
              <DateRangePicker.TriggerIndicator />
            </DateRangePicker.Trigger>
          </DateField.Suffix>
        </DateField.Group>
        <DateRangePicker.Popover className="rounded-xl border border-slate-200 bg-white p-2 shadow-xl" placement="bottom end">
          <RangeCalendar aria-label={label} firstDayOfWeek="sat" className="w-80 max-w-[calc(100vw-32px)]">
            <RangeCalendar.Header>
              <RangeCalendar.NavButton slot="previous" aria-label="ماه قبل"><ChevronRight size={18} aria-hidden="true" /></RangeCalendar.NavButton>
              <RangeCalendar.Heading />
              <RangeCalendar.NavButton slot="next" aria-label="ماه بعد"><ChevronLeft size={18} aria-hidden="true" /></RangeCalendar.NavButton>
            </RangeCalendar.Header>
            <RangeCalendar.Grid>
              <RangeCalendar.GridHeader>
                {(day) => <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>}
              </RangeCalendar.GridHeader>
              <RangeCalendar.GridBody>
                {(date) => <RangeCalendar.Cell date={date} />}
              </RangeCalendar.GridBody>
            </RangeCalendar.Grid>
          </RangeCalendar>
        </DateRangePicker.Popover>
      </DateRangePicker>
    </I18nProvider>
  );
}
