"use client";

import { Toast } from "@heroui/react";

const toastColors = {
  danger: "border-rose-700 bg-rose-600 text-white shadow-[0_18px_45px_rgba(190,24,93,0.35)]",
  warning: "border-amber-500 bg-amber-400 text-amber-950 shadow-[0_18px_45px_rgba(217,119,6,0.3)]",
  success: "border-emerald-700 bg-emerald-600 text-white shadow-[0_18px_45px_rgba(5,150,105,0.3)]",
  accent: "border-blue-700 bg-blue-600 text-white shadow-[0_18px_45px_rgba(37,99,235,0.3)]",
  default: "border-slate-800 bg-slate-900 text-white shadow-[0_18px_45px_rgba(15,23,42,0.35)]",
} as const;

export function AppToasts() {
  return (
    <Toast.Provider placement="top" maxVisibleToasts={3} width={400} className="z-[300]">
      {({ toast: queuedToast }) => {
        const content = queuedToast.content;
        const variant = content.variant ?? "default";

        return (
          <Toast
            toast={queuedToast}
            variant={variant}
            placement="top"
            dir="rtl"
            className={`min-h-20 flex-row items-start gap-3 overflow-hidden border-2 px-4 py-4 text-right ${toastColors[variant]}`}
          >
            {content.indicator === null ? null : (
              <Toast.Indicator variant={variant} className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-white/20 p-2 text-current [&_svg]:size-5">
                {content.indicator}
              </Toast.Indicator>
            )}
            <Toast.Content className="min-w-0 flex-1 items-start gap-1 self-start text-right">
              {content.title ? <Toast.Title className="w-full text-right text-sm font-black text-current">{content.title}</Toast.Title> : null}
              {content.description ? <Toast.Description className="w-full text-right text-xs leading-6 text-current opacity-95">{content.description}</Toast.Description> : null}
              {content.actionProps?.children ? <Toast.ActionButton {...content.actionProps} className="mt-2 border border-white/30 bg-white/15 text-current">{content.actionProps.children}</Toast.ActionButton> : null}
            </Toast.Content>
            <Toast.CloseButton className="pointer-events-auto absolute left-2 top-2 right-auto size-7 border border-white/25 bg-white/15 text-current opacity-100" />
          </Toast>
        );
      }}
    </Toast.Provider>
  );
}
