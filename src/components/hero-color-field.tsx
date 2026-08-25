"use client";

import type { ReactNode } from "react";
import { Button, ColorArea, ColorField, ColorPicker, ColorSlider, ColorSwatch, Label, parseColor } from "@heroui/react";

/**
 * The HeroUI half of the toolbar's colour control, matching `BpColorPicker`'s contract so the
 * two templates behave identically and differ only in looks.
 *
 * `value` is the colour actually on the selection; `null` means the mark is not applied, which
 * is what lets the clear action exist at all.
 */
export type HeroColorFieldProps = {
  label: string;
  icon: ReactNode;
  value: string | null;
  fallback: string;
  clearLabel: string;
  onChange: (hex: string) => void;
  onClear: () => void;
};

/** `parseColor` throws on anything it cannot read, and a stored colour may be any CSS form. */
function safeParse(hex: string, fallback: string) {
  try {
    return parseColor(hex);
  } catch {
    return parseColor(fallback);
  }
}

export function HeroColorField({ label, icon, value, fallback, clearLabel, onChange, onClear }: HeroColorFieldProps) {
  const current = safeParse(value ?? fallback, fallback);
  return (
    <ColorPicker value={current} onChange={(color) => onChange(color.toString("hex"))}>
      <ColorPicker.Trigger className="relative grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-white" aria-label={label}>
        {icon}
        <ColorSwatch color={current} size="sm" className="absolute bottom-0.5 right-1 h-2 w-5 rounded-sm" />
      </ColorPicker.Trigger>
      <ColorPicker.Popover className="z-[210] w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
        <div dir="rtl" className="grid gap-4 text-right">
          <ColorArea colorSpace="hsb" xChannel="saturation" yChannel="brightness" className="h-44 w-full rounded-xl">
            <ColorArea.Thumb />
          </ColorArea>
          <ColorSlider colorSpace="hsb" channel="hue">
            <ColorSlider.Track className="h-7 rounded-full"><ColorSlider.Thumb /></ColorSlider.Track>
          </ColorSlider>
          <ColorField>
            <Label className="text-xs font-bold text-slate-600">کد رنگ</Label>
            <ColorField.Group variant="secondary" fullWidth><ColorField.Input /></ColorField.Group>
          </ColorField>
          <Button type="button" size="sm" variant="secondary" isDisabled={!value} onPress={onClear} className="justify-self-start">{clearLabel}</Button>
        </div>
      </ColorPicker.Popover>
    </ColorPicker>
  );
}
