"use client";

import { useId, type ReactNode } from "react";
import { BpButton } from "./blueprint/ui/button";
import { BpDialog, type BpDialogSize } from "./blueprint/ui/dialog";

/*
 * The admin panel's one modal. `BpDialog`'s portal re-declares `.bp-root`, and its content
 * boundary carries `dir="rtl"`. Dialog bodies should be written against the theme variables
 * (`--surface`, `--border`, `--muted`, `--accent`), not hard-coded palette utilities.
 */
export function AdminDialog({ open, title, description, size = "sm", isBusy = false, labelledBy, onClose, actions, children }: {
  open: boolean;
  title: ReactNode;
  /** Plain-text name for assistive tech, since `title` may be markup. */
  ariaLabel?: string;
  description?: ReactNode;
  size?: BpDialogSize;
  /** While an action is in flight the dialog refuses to close. */
  isBusy?: boolean;
  labelledBy?: string;
  onClose: () => void;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  const generatedId = useId();
  const titleId = labelledBy ?? `${generatedId}-title`;
  const close = () => { if (!isBusy) onClose(); };

  return (
    <BpDialog open={open} size={size} title={title} description={description} labelledBy={titleId} onClose={close} actions={actions}>
      {children}
    </BpDialog>
  );
}

/**
 * The button for a dialog's action row. Async actions must pass `isPending`: it disables the
 * button and shows the spinner for the whole wait, per the admin rules.
 */
export function AdminDialogButton({ variant = "secondary", isPending = false, isDisabled = false, onPress, children, className = "" }: {
  variant?: "primary" | "secondary" | "danger";
  isPending?: boolean;
  isDisabled?: boolean;
  onPress: () => void;
  children: ReactNode;
  className?: string;
}) {
  return <BpButton variant={variant} isPending={isPending} disabled={isDisabled} onClick={onPress} className={className}>{children}</BpButton>;
}
