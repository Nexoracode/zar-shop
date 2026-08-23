import type { ReactNode } from "react";
import { Spinner } from "@heroui/react";

// Swaps a button's label for just a spinner while pending, without changing the button's
// width: the label stays laid out (via `invisible`, not `hidden`) and the spinner is
// centered on top of it.
export function LoadingLabel({ isPending, children }: { isPending: boolean; children: ReactNode }) {
  return (
    <span className="relative inline-flex items-center justify-center gap-1">
      <span className={isPending ? "invisible" : "inline-flex items-center gap-1"}>{children}</span>
      {isPending && <Spinner color="current" size="sm" className="absolute" />}
    </span>
  );
}
