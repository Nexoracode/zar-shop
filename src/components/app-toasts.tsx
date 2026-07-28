"use client";

import { Toast } from "@heroui/react";

const toastColors = {
  danger: "border-0 border-r-[3px] border-r-[#D31736] bg-white text-slate-800 shadow-[0_18px_45px_rgba(15,23,42,0.16)]",
  warning: "border-0 border-r-[3px] border-r-amber-500 bg-white text-slate-800 shadow-[0_18px_45px_rgba(15,23,42,0.16)]",
  success: "border-0 border-r-[3px] border-r-emerald-600 bg-white text-slate-800 shadow-[0_18px_45px_rgba(15,23,42,0.16)]",
  accent: "border-0 border-r-[3px] border-r-blue-600 bg-white text-slate-800 shadow-[0_18px_45px_rgba(15,23,42,0.16)]",
  default: "border-0 border-r-[3px] border-r-slate-500 bg-white text-slate-800 shadow-[0_18px_45px_rgba(15,23,42,0.16)]",
} as const;

const indicatorColors = {
  danger: "bg-red-50 text-[#D31736]",
  warning: "bg-amber-50 text-amber-600",
  success: "bg-emerald-50 text-emerald-600",
  accent: "bg-blue-50 text-blue-600",
  default: "bg-slate-100 text-slate-600",
} as const;

export function AppToasts() {
  return (
    <Toast.Provider placement="top start" maxVisibleToasts={3} width={400} className="z-[300]">
      {({ toast: queuedToast }) => {
        const content = queuedToast.content;
        const variant = content.variant ?? "default";

        return (
          <Toast
            toast={queuedToast}
            variant={variant}
            placement="top start"
            dir="rtl"
            className={`min-h-20 flex-row items-start gap-3 overflow-hidden px-4 py-4 text-right ${toastColors[variant]}`}
            style={{ borderTopRightRadius: 4, borderBottomRightRadius: 4, borderTopLeftRadius: 18, borderBottomLeftRadius: 18 }}
          >
            {content.indicator === null ? null : (
              <Toast.Indicator variant={variant} className={`mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl p-2 [&_svg]:size-5 ${indicatorColors[variant]}`}>
                {content.indicator}
              </Toast.Indicator>
            )}
            <Toast.Content className="min-w-0 flex-1 items-start gap-1 self-start text-right">
              {content.title ? <Toast.Title className="w-full text-right text-sm font-black text-current">{content.title}</Toast.Title> : null}
              {content.description ? <Toast.Description className="w-full text-right text-xs leading-6 text-current opacity-95">{content.description}</Toast.Description> : null}
              {content.actionProps?.children ? <Toast.ActionButton {...content.actionProps} className="mt-2 border border-slate-200 bg-slate-50 text-slate-700">{content.actionProps.children}</Toast.ActionButton> : null}
            </Toast.Content>
            <Toast.CloseButton className="pointer-events-auto absolute left-2 top-2 right-auto size-7 border border-slate-200 bg-slate-100 text-slate-500 opacity-100" />
          </Toast>
        );
      }}
    </Toast.Provider>
  );
}
