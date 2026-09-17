import { BpBar, BpPageHeaderSkeleton } from "@/components/admin/blueprint/skeleton";

// Mirrors `MediaLibrary`: upload box + filter row + thumbnail grid, with the details panel aside.
export default function MediaLoading() {
  return (
    <div className="animate-pulse" aria-hidden>
      <BpPageHeaderSkeleton />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-4">
          <div className="grid gap-3 border border-[var(--bp-divider)] p-4">
            <BpBar className="h-3 w-40" />
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
              <BpBar className="h-9 w-full" />
              <BpBar className="h-9 w-32" />
              <BpBar className="h-9 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 12 }).map((_, index) => (
              <BpBar key={index} className="aspect-square w-full" />
            ))}
          </div>
        </div>
        <div className="bp-frame relative p-[18px]">
          <BpBar className="h-2.5 w-28" />
          <div className="mt-4 flex flex-col gap-2.5">
            {Array.from({ length: 5 }).map((_, index) => (
              <BpBar key={index} className="h-9 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
