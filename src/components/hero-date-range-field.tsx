"use client";

import { DateField, DateRangePicker, Label, RangeCalendar } from "@heroui/react";
import { parseDate, type DateValue } from "@internationalized/date";
import { I18nProvider } from "react-aria-components";

type Props = {
  label: string;
  start: string | null;
  end: string | null;
  onChange: (range: { start: string; end: string } | null) => void;
  isDisabled?: boolean;
};

export function HeroDateRangeField({ label, start, end, onChange, isDisabled = false }: Props) {
  const value = start && end ? { start: parseDate(start), end: parseDate(end) } : null;

  return (
    <I18nProvider locale="fa-IR-u-ca-persian">
      <DateRangePicker<DateValue>
        value={value}
        onChange={(range) => onChange(range ? { start: range.start.toString(), end: range.end.toString() } : null)}
        isDisabled={isDisabled}
        className="grid gap-1.5"
      >
        <Label className="text-xs font-bold text-slate-500">{label}</Label>
        <DateField.Group fullWidth variant="secondary" className="min-h-11 rounded-xl border border-slate-200 bg-white">
          <DateField.InputContainer className="min-w-0 flex-1 px-3">
            <DateField.Input slot="start" className="min-w-0 flex-1">
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
            <DateRangePicker.RangeSeparator className="px-1 text-slate-400">تا</DateRangePicker.RangeSeparator>
            <DateField.Input slot="end" className="min-w-0 flex-1">
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
          <RangeCalendar aria-label="انتخاب بازه تخفیف" firstDayOfWeek="sat" className="w-80 max-w-[calc(100vw-32px)]">
            <RangeCalendar.Header>
              <RangeCalendar.NavButton slot="previous" aria-label="ماه قبل" />
              <RangeCalendar.Heading />
              <RangeCalendar.NavButton slot="next" aria-label="ماه بعد" />
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
