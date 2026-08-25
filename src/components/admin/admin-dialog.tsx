"use client";

import { useId, type ReactNode } from "react";
import { Button, Modal, Spinner } from "@heroui/react";
import { X } from "lucide-react";
import { useAdminTemplate } from "./template-context";
import { BpButton } from "./blueprint/ui/button";
import { BpDialog, type BpDialogSize } from "./blueprint/ui/dialog";

/*
 * The admin panel's one modal.
 *
 * HeroUI renders its modal into a portal on `document.body`, which lands outside `.bp-root` —
 * so the compatibility layer that re-points the classic theme variables never reached it and
 * every dialog kept its classic chrome inside the Blueprint shell. Routing all of them through
 * here fixes that at the source: Blueprint gets `BpDialog`, whose portal re-declares `.bp-root`,
 * and the classic template keeps the HeroUI modal. Both carry `dir="rtl"` on their own content
 * boundary.
 *
 * Dialog bodies should be written against the theme variables (`--surface`, `--border`,
 * `--muted`, `--accent`), not hard-coded palette utilities, so one body serves both templates.
 */
export function AdminDialog({ open, title, ariaLabel, description, size = "sm", isBusy = false, labelledBy, onClose, actions, children }: {
  open: boolean;
  title: ReactNode;
  /** Plain-text name for assistive tech, since `title` may be markup. */
  ariaLabel: string;
  description?: ReactNode;
  size?: BpDialogSize;
  /** While an action is in flight the dialog refuses to close. */
  isBusy?: boolean;
  labelledBy?: string;
  onClose: () => void;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  const template = useAdminTemplate();
  const generatedId = useId();
  // Without this the dialog role has no accessible name when the caller does not supply one.
  const titleId = labelledBy ?? `${generatedId}-title`;
  const close = () => { if (!isBusy) onClose(); };

  if (template === "BLUEPRINT") {
    return (
      <BpDialog open={open} size={size} title={title} description={description} labelledBy={titleId} onClose={close} actions={actions}>
        {children}
      </BpDialog>
    );
  }

  return (
    <Modal.Backdrop isOpen={open} onOpenChange={(isOpen) => { if (!isOpen) close(); }} variant="blur">
      <Modal.Container size={size} placement="center" scroll="inside">
        <Modal.Dialog aria-label={ariaLabel} dir="rtl" className="mx-3 max-h-[calc(100dvh-32px)] overflow-hidden bg-[var(--surface)] text-right text-[var(--foreground)]">
          <Modal.Header className="flex-row items-start justify-between gap-4 border-b border-[var(--border)] p-5">
            <div className="min-w-0">
              <Modal.Heading className="text-base font-bold" id={titleId}>{title}</Modal.Heading>
              {description && <p className="mb-0 mt-1 text-xs text-[var(--muted)]">{description}</p>}
            </div>
            <Button type="button" isIconOnly variant="ghost" isDisabled={isBusy} aria-label="بستن" onPress={close} className="size-9 min-h-9 min-w-9 shrink-0 rounded-lg text-[var(--muted)] hover:bg-[var(--surface-secondary)]">
              <X size={18} />
            </Button>
          </Modal.Header>
          <Modal.Body className="grid gap-3 p-5">{children}</Modal.Body>
          {actions && <Modal.Footer className="flex flex-row justify-start gap-2 border-t border-[var(--border)] p-4">{actions}</Modal.Footer>}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

/**
 * The button for a dialog's action row. Same contract in both templates, so a dialog declares
 * its actions once. Async actions must pass `isPending`: it disables the button and shows the
 * spinner for the whole wait, per the admin rules.
 */
export function AdminDialogButton({ variant = "secondary", isPending = false, isDisabled = false, onPress, children, className = "" }: {
  variant?: "primary" | "secondary" | "danger";
  isPending?: boolean;
  isDisabled?: boolean;
  onPress: () => void;
  children: ReactNode;
  className?: string;
}) {
  const template = useAdminTemplate();
  if (template === "BLUEPRINT") {
    return <BpButton variant={variant} isPending={isPending} disabled={isDisabled} onClick={onPress} className={className}>{children}</BpButton>;
  }
  return (
    <Button type="button" variant={variant} isPending={isPending} isDisabled={isDisabled} onPress={onPress} className={`gap-2 ${className}`.trim()}>
      {({ isPending: pending }) => <>{pending && <Spinner color="current" size="sm" />}{children}</>}
    </Button>
  );
}
