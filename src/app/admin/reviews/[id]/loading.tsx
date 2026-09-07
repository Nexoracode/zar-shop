import { BpBar, BpPageHeaderSkeleton, BpStatCardsSkeleton } from "@/components/admin/blueprint/skeleton";

export default function ReviewDetailLoading() {
  return (
    <div className="animate-pulse" aria-hidden>
      <BpPageHeaderSkeleton withBack withAction />
      <div className="mb-5 mt-6">
        <BpStatCardsSkeleton count={4} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid content-start gap-4">
          {Array.from({ length: 2 }).map((_, block) => (
            <div key={block} className="bp-frame relative p-[18px]">
              <BpBar className="h-2.5 w-32" />
              <div className="mt-4 flex flex-col gap-2.5">
                {Array.from({ length: 5 }).map((__, line) => (
                  <BpBar key={line} className="h-4 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="bp-frame relative p-[18px]">
          <BpBar className="h-2.5 w-24" />
          <div className="mt-4 flex flex-col gap-2.5">
            {Array.from({ length: 4 }).map((_, line) => (
              <BpBar key={line} className="h-3.5 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
