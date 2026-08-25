"use client";

import { useRef, useState, type ReactNode } from "react";
import { BpButton } from "./button";
import { BpPopover } from "./popover";

/**
 * A colour control for the toolbar: a palette, a native colour input for anything outside it,
 * and — the part HeroUI's picker never offered — a way to take the colour back off again.
 *
 * `value` is the colour actually applied to the selection, so `null` means "no colour set" and
 * the clear action can tell the two apart. `fallback` is only what the picker opens on.
 */
export type BpColorPickerProps = {
  label: string;
  icon: ReactNode;
  value: string | null;
  fallback: string;
  clearLabel: string;
  onChange: (hex: string) => void;
  onClear: () => void;
};

/** Two rows: neutrals and text greys first, then the colours a description actually reaches for. */
const presets = [
  "#1d1f20", "#3f4448", "#6b7280", "#9ca3af", "#d1d5db", "#ffffff", "#5980a6", "#2c455d",
  "#a33a33", "#d97706", "#ca8a04", "#2f7d4f", "#0f766e", "#7c3aed", "#be185d", "#fff1a8",
];

const hexPattern = /^#[0-9a-f]{6}$/i;

export function BpColorPicker({ label, icon, value, fallback, clearLabel, onChange, onClear }: BpColorPickerProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const current = value ?? fallback;
  // Seeded when the panel opens rather than from an effect, so a half-typed hex is never
  // overwritten while the reader is still typing it.
  const [draft, setDraft] = useState(current);

  function pick(hex: string) {
    setDraft(hex);
    onChange(hex);
  }

  return (
    <>
      <BpButton
        ref={triggerRef}
        size="sm"
        isIconOnly
        variant={value ? "primary" : "ghost"}
        aria-label={label}
        aria-expanded={open}
        className="relative"
        onClick={() => { if (!open) setDraft(current); setOpen((state) => !state); }}
      >
        {icon}
        <span aria-hidden="true" className="bp-swatch-bar" style={{ background: current }} />
      </BpButton>

      <BpPopover open={open} anchorRef={triggerRef} onClose={() => setOpen(false)} label={label} width={252}>
        <div className="grid gap-3">
          <div className="bp-swatch-grid">
            {presets.map((hex) => (
              <button
                key={hex}
                type="button"
                className="bp-swatch"
                aria-label={hex}
                aria-pressed={value?.toLowerCase() === hex.toLowerCase()}
                style={{ background: hex }}
                onClick={() => pick(hex)}
              />
            ))}
          </div>

          <div className="grid gap-1">
            <span className="bp-muted text-[12px]">رنگ دلخواه</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={hexPattern.test(current) ? current : "#000000"}
                aria-label={`${label} دلخواه`}
                className="bp-color-input"
                onChange={(event) => pick(event.target.value)}
              />
              <input
                value={draft}
                dir="ltr"
                aria-label="کد رنگ"
                spellCheck={false}
                maxLength={7}
                className="bp-input flex-1"
                onChange={(event) => {
                  const next = event.target.value;
                  setDraft(next);
                  if (hexPattern.test(next)) onChange(next);
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-[var(--bp-divider)] pt-3">
            <BpButton size="sm" variant="ghost" disabled={!value} onClick={() => { onClear(); setOpen(false); }}>{clearLabel}</BpButton>
            <BpButton size="sm" variant="secondary" onClick={() => setOpen(false)}>بستن</BpButton>
          </div>
        </div>
      </BpPopover>
    </>
  );
}
