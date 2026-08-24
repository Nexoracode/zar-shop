"use client";

import type { ReactNode } from "react";

export function BpSwitch({ isSelected, onChange, children, isDisabled = false, className = "" }: {
  isSelected: boolean;
  onChange: (selected: boolean) => void;
  children?: ReactNode;
  isDisabled?: boolean;
  className?: string;
}) {
  return (
    <label className={`bp-switch ${isDisabled ? "cursor-not-allowed opacity-55" : ""} ${className}`.trim()}>
      <input
        type="checkbox"
        role="switch"
        checked={isSelected}
        disabled={isDisabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span aria-hidden className="bp-switch-track"><span className="bp-switch-thumb" /></span>
      {children && <span>{children}</span>}
    </label>
  );
}
