"use client";

import { Toast } from "@heroui/react";

export function AppToasts() {
  return <Toast.Provider placement="bottom end" maxVisibleToasts={3} width={380} className="z-[300]" />;
}
