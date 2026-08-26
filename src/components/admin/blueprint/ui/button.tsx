"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

export type BpButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variantClass: Record<BpButtonVariant, string> = {
  primary: "bp-btn-primary",
  secondary: "bp-btn-secondary",
  ghost: "bp-btn-ghost",
  danger: "bp-btn-danger",
};

function classes({ variant = "secondary", size, isIconOnly, fullWidth, className = "" }: BpButtonStyleProps) {
  return [
    "bp-btn",
    variantClass[variant],
    size === "sm" ? "bp-btn-sm" : "",
    isIconOnly ? "bp-btn-icon" : "",
    fullWidth ? "bp-btn-block" : "",
    className,
  ].filter(Boolean).join(" ");
}

type BpButtonStyleProps = {
  variant?: BpButtonVariant;
  size?: "sm" | "md";
  isIconOnly?: boolean;
  fullWidth?: boolean;
  className?: string;
};

export function BpSpinner({ size = 15 }: { size?: number }) {
  return (
    <svg className="bp-spinner" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}

type BpButtonProps = BpButtonStyleProps
  & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className">
  & {
    /** React 19 passes refs as a plain prop; the header anchors its popovers to one. */
    ref?: Ref<HTMLButtonElement>;
    /**
     * Marks an in-flight async action. The button stays disabled and shows a spinner for the
     * whole wait, so no admin action can be disabled without visible loading feedback.
     */
    isPending?: boolean;
    children?: ReactNode;
  };

export function BpButton({ variant = "secondary", size, isIconOnly, fullWidth, className, isPending, disabled, children, type = "button", ...rest }: BpButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isPending}
      aria-busy={isPending || undefined}
      className={classes({ variant, size, isIconOnly, fullWidth, className: className ?? "" })}
      {...rest}
    >
      {isPending && <BpSpinner size={size === "sm" ? 13 : 15} />}
      {children}
    </button>
  );
}

type BpLinkButtonProps = BpButtonStyleProps & { href: string; children: ReactNode; "aria-label"?: string };

export function BpLinkButton({ href, variant = "secondary", size, isIconOnly, fullWidth, className, children, ...rest }: BpLinkButtonProps) {
  return (
    <Link
      href={href}
      className={classes({ variant, size, isIconOnly, fullWidth, className: className ?? "" })}
      {...rest}
    >
      {children}
    </Link>
  );
}
