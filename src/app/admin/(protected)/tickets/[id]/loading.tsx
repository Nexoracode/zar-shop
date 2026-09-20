import { BpBar } from "@/components/admin/blueprint/skeleton";

// Mirrors `BlueprintTicketChat`: no page header — a panel that fills the whole content area (the real one is
// fixed to the `<main>` rect, so the `-m` classes cancel its padding), with the ticket bar on top, the message
// list in the middle and the composer at the bottom.
export default function TicketDetailLoading() {
  return (
    <div className="-mx-4 -my-6 animate-pulse sm:-mx-7" aria-hidden>
      <section className="bp-frame flex h-[calc(100dvh-48px)] flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-[var(--bp-divider)] px-4 py-3">
          <BpBar className="size-9 shrink-0" />
          <BpBar className="size-9 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5"><BpBar className="h-3.5 w-56 max-w-full" /><BpBar className="h-2.5 w-72 max-w-full" /></div>
          <BpBar className="h-6 w-20 shrink-0" />
          <BpBar className="size-9 shrink-0" />
          <BpBar className="h-[30px] w-20 shrink-0" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3 bg-[var(--bp-bg)] px-4 py-4">
          <BpBar className="h-14 w-2/3 max-w-md self-start" />
          <BpBar className="h-10 w-1/2 max-w-sm self-end" />
          <BpBar className="h-20 w-3/5 max-w-lg self-start" />
          <BpBar className="h-10 w-2/5 max-w-xs self-end" />
        </div>
        <div className="border-t border-[var(--bp-divider)] p-3">
          <BpBar className="h-[90px] w-full" />
          <div className="mt-2 flex items-center gap-2"><BpBar className="h-[30px] w-28" /><BpBar className="h-[30px] w-20" /></div>
        </div>
      </section>
    </div>
  );
}
