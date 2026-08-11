"use client";

import type { ComponentProps, ReactNode } from "react";
import { Button, Spinner } from "@heroui/react";
import { Save } from "lucide-react";

type ButtonProps = ComponentProps<typeof Button>;

type AdminSaveButtonProps = Omit<ButtonProps, "children" | "className" | "isDisabled" | "isPending"> & {
  isSaving: boolean;
  label: ReactNode;
  savingLabel?: ReactNode;
  icon?: ReactNode;
  className?: string;
  isDisabled?: boolean;
};

export function AdminSaveButton({
  isSaving,
  label,
  savingLabel = "در حال ذخیره...",
  icon = <Save className="!size-[15px]" />,
  className = "",
  isDisabled = false,
  type = "submit",
  ...props
}: AdminSaveButtonProps) {
  return <Button
    {...props}
    type={type}
    size="sm"
    variant="primary"
    isPending={isSaving}
    isDisabled={isSaving || isDisabled}
    aria-label={typeof (isSaving ? savingLabel : label) === "string" ? String(isSaving ? savingLabel : label) : undefined}
    className={`!h-10 !min-h-10 shrink-0 gap-2 rounded-lg px-4 !text-xs !font-normal ${className}`}
  >
    {isSaving ? <><Spinner size="sm" color="current" />{savingLabel}</> : <>{icon}{label}</>}
  </Button>;
}
