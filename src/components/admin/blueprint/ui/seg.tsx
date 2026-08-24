"use client";

import { useId, type ReactNode } from "react";

export type BpSegOption<T extends string> = { value: T; label: ReactNode };

/**
 * Segmented radio group — the design system's `.seg`. Backed by real radio inputs so keyboard
 * navigation and form semantics come for free.
 */
export function BpSeg<T extends string>({ options, value, onChange, label, name, fullWidth = false, className = "" }: {
  options: BpSegOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  name?: string;
  fullWidth?: boolean;
  className?: string;
}) {
  const generated = useId();
  const groupName = name ?? generated;
  return (
    <div role="radiogroup" aria-label={label} className={`bp-seg ${fullWidth ? "w-full" : ""} ${className}`.trim()}>
      {options.map((option) => (
        <label key={option.value} className={`bp-seg-opt ${fullWidth ? "flex-1" : ""}`.trim()}>
          <input
            type="radio"
            name={groupName}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
