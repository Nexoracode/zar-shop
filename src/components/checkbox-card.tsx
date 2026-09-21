"use client";

import type { ComponentProps, ReactNode } from "react";
import { Checkbox } from "@heroui/react";

type Props = Omit<ComponentProps<typeof Checkbox>, "children" | "className"> & {
  children: ReactNode;
  /** A small icon medallion before the label. */
  icon?: ReactNode;
};

/**
 * A checkbox drawn as a bordered card whose whole surface toggles it, the label on the reading side and the box
 * at the far end. Used by the page builder's display-settings dialog, so its accent is the builder's (`--pb-accent`),
 * not the store's brand color.
 */
export function CheckboxCard({ children, icon, ...props }: Props) {
  return (
    <Checkbox {...props} className="w-full">
      <Checkbox.Content className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-right transition hover:border-[var(--pb-accent)] data-[selected]:border-[var(--pb-accent)] data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[disabled]:hover:border-[var(--border)]">
        {icon ? <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--pb-glow)] text-[var(--pb-accent)]">{icon}</span> : null}
        <span className="min-w-0 flex-1 text-sm font-medium text-[var(--foreground)]">{children}</span>
        <Checkbox.Control className="size-5 shrink-0 rounded-md border-2 border-[var(--field-border)] bg-[var(--surface)] text-white transition data-[selected]:border-[var(--pb-accent)] data-[selected]:bg-[var(--pb-accent)]">
          <Checkbox.Indicator className="grid size-full place-items-center p-0.5" />
        </Checkbox.Control>
      </Checkbox.Content>
    </Checkbox>
  );
}
