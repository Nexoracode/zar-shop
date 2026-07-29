"use client";

import { I18nProvider, Toast } from "@heroui/react";

export function AppToasts() {
  return (
    <I18nProvider locale="fa-IR">
      <Toast.Provider
        placement="top end"
        maxVisibleToasts={3}
        width="min(420px, calc(100vw - 32px))"
        gap={10}
        className="z-[300] text-right"
      />
    </I18nProvider>
  );
}
