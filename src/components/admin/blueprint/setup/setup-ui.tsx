import type { ReactNode } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { BpButton, BpTag } from "../ui";

/**
 * The pieces every setup step is built from, so all six read the same way: a titled section that
 * says what is being asked and why, and a footer that always carries the same two controls — back
 * on the right, and the one thing to do next on the left.
 */

/** One block of a step: what it is for, whether it is done, then its fields. */
export function SetupSection({ title, description, status, optional = false, children }: {
  title: string;
  description?: ReactNode;
  /** Shown as a tag when the section can be complete or not on its own (a gateway, a shipping method). */
  status?: "done" | "todo";
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3 border-t border-[var(--bp-divider)] p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div role="heading" aria-level={3} className="text-[14px] font-bold">{title}</div>
          {description && <p className="bp-muted m-0 mt-1 text-[12px] leading-6">{description}</p>}
        </div>
        {status && <BpTag tone={status === "done" ? "success" : "warning"} withDot>{status === "done" ? "کامل" : "لازم است"}</BpTag>}
        {!status && optional && <BpTag>اختیاری</BpTag>}
      </header>
      <div>{children}</div>
    </section>
  );
}

/**
 * The bottom bar of a step. `primary` is the single action that moves on (a submit button, or
 * "ادامه"); `hint` says, in words, what is still missing when that action is not yet available.
 */
export function SetupFooter({ onBack, primary, hint }: { onBack?: () => void; primary: ReactNode; hint?: ReactNode }) {
  return (
    <footer className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 rounded-b-[var(--bp-radius)] border-t border-[var(--bp-divider)] bg-[var(--bp-card)] px-5 py-3.5">
      {onBack
        ? <BpButton type="button" variant="ghost" onClick={onBack} className="gap-1.5"><ArrowRight size={15} />گام قبلی</BpButton>
        : <span aria-hidden className="hidden sm:block sm:w-[88px]" />}
      {hint && <p className="bp-muted m-0 min-w-0 flex-1 basis-[200px] text-[12px] leading-6" role="status">{hint}</p>}
      <div className="ms-auto flex items-center gap-2">{primary}</div>
    </footer>
  );
}

/** A green note that a part is already set up, so the step reads as done instead of asking again. */
export function SetupDoneNote({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-[var(--bp-radius-sm)] border border-[var(--bp-success)] bg-[var(--bp-success-bg)] p-3.5">
      <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[var(--bp-success)]" aria-hidden />
      <div className="min-w-0 flex-1 text-[12.5px] leading-7">
        <strong className="block text-[13px]">{title}</strong>
        {children}
      </div>
    </div>
  );
}
