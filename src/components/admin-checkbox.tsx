"use client";

import type { ComponentProps, ReactNode } from "react";
import { Checkbox } from "@heroui/react";

type Props = Omit<ComponentProps<typeof Checkbox>, "children" | "className"> & {
  children: ReactNode;
  icon?: ReactNode;
  description?: string;
};

export function AdminCheckbox({ children, icon, description, ...props }: Props) {
  return (
    <Checkbox {...props} className="w-full">
      <Checkbox.Content className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-right transition hover:border-[#c7aa70] hover:bg-[#fffcf7] data-[selected]:border-[#b5904c] data-[selected]:bg-[#fbf7ef]">
        <Checkbox.Control className="size-5 shrink-0 rounded-md border-2 border-slate-300 bg-white text-white transition data-[selected]:border-[#b5904c] data-[selected]:bg-[#b5904c]">
          <Checkbox.Indicator className="grid size-full place-items-center p-0.5" />
        </Checkbox.Control>
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {icon ? <span className="shrink-0 text-[#a57d39]">{icon}</span> : null}
          <span className="min-w-0">
            <strong className="block text-sm font-bold text-slate-700">{children}</strong>
            {description ? <small className="mt-0.5 block text-[11px] font-normal leading-5 text-slate-400">{description}</small> : null}
          </span>
        </span>
      </Checkbox.Content>
    </Checkbox>
  );
}
