import type { ReactNode } from "react";

/*
 * Route-level loading placeholders for the Blueprint admin panel.
 *
 * Every admin `loading.tsx` composes these so the skeleton keeps the exact shell of the page it
 * stands in for — header, filter bar, table, form sections, detail columns — and the layout does
 * not jump when the real data arrives. Pure Blueprint markup: `bp-frame` surfaces, `--bp-surface`
 * shimmer bars, no HeroUI. Matches the pattern already set by `admin/reports/report-skeleton.tsx`.
 */

/** A single shimmer bar. Size it with height/width utilities on `className`. */
export function BpBar({ className = "" }: { className?: string }) {
  return <span className={`block rounded bg-[var(--bp-surface)] ${className}`.trim()} />;
}

function Frame({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <div className={`bp-frame relative ${className}`.trim()}>{children}</div>;
}

/** Placeholder for `AdminPageHeader` — title + description lines, optional back link and action. */
export function BpPageHeaderSkeleton({ withBack = false, withAction = false, flush = false }: { withBack?: boolean; withAction?: boolean; flush?: boolean }) {
  return (
    <header className={`${flush ? "" : "mb-6"} flex flex-col gap-4 border-b border-[var(--bp-divider)] pb-2.5 sm:flex-row sm:items-center sm:justify-between`.trim()}>
      <div className="flex min-w-0 flex-col gap-2">
        {withBack && <BpBar className="h-3 w-32" />}
        <BpBar className="h-6 w-48" />
        <BpBar className="h-3 w-72 max-w-full" />
      </div>
      {withAction && <BpBar className="h-9 w-36 shrink-0" />}
    </header>
  );
}

/** Placeholder for the shared search + filter bar (`AdminListFilters` / `BpListFilters`). */
export function BpFilterBarSkeleton({ selects = 1 }: { selects?: number }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[var(--bp-divider)] p-3">
      <BpBar className="h-9 min-w-[200px] flex-1" />
      {Array.from({ length: selects }).map((_, index) => (
        <BpBar key={index} className="h-9 w-full sm:w-44" />
      ))}
    </div>
  );
}

/** Placeholder for a `BpTable` — header row plus `rows` body rows at `columns` wide. */
export function BpTableSkeleton({ columns = 5, rows = 8, minWidth = 640 }: { columns?: number; rows?: number; minWidth?: number }) {
  return (
    <div className="bp-table-scroll">
      <div style={{ minWidth }}>
        <div className="flex items-center gap-4 border-b border-[var(--bp-divider)] px-4 py-3">
          {Array.from({ length: columns }).map((_, index) => (
            <BpBar key={index} className="h-2.5 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="flex items-center gap-4 border-b border-[var(--bp-row-line)] px-4 py-3.5 last:border-b-0">
            {Array.from({ length: columns }).map((__, cell) => (
              <BpBar key={cell} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Placeholder for the list footer (`AdminPagination`) — rows-per-page picker + page stepper. */
export function BpPaginationSkeleton() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--bp-divider)] px-4 py-3">
      <BpBar className="h-7 w-40" />
      <BpBar className="h-7 w-32" />
    </div>
  );
}

/** Placeholder KPI/stat cards, laid out like `admin/reports`. */
export function BpStatCardsSkeleton({ count = 4, columns = "sm:grid-cols-2 xl:grid-cols-4" }: { count?: number; columns?: string }) {
  return (
    <div className={`grid grid-cols-1 gap-2 ${columns}`.trim()}>
      {Array.from({ length: count }).map((_, index) => (
        <Frame key={index} className="h-[104px] p-[18px]">
          <BpBar className="h-2.5 w-24" />
          <BpBar className="mt-3 h-6 w-32" />
          <BpBar className="mt-2 h-2 w-20" />
        </Frame>
      ))}
    </div>
  );
}

function FieldSkeleton() {
  return (
    <div>
      <BpBar className="mb-1.5 h-2.5 w-20" />
      <BpBar className="h-9 w-full" />
    </div>
  );
}

/** Placeholder for one framed form section — kicker, optional description, a grid of fields. */
export function BpFormSectionSkeleton({ fields = 4, columns = 2, withDescription = true }: { fields?: number; columns?: 1 | 2; withDescription?: boolean }) {
  return (
    <section className="bp-frame relative p-[18px]">
      <BpBar className="h-2.5 w-32" />
      {withDescription && <BpBar className="mt-1.5 h-2 w-56 max-w-full" />}
      <div className={`mt-4 grid gap-3 ${columns === 2 ? "sm:grid-cols-2" : ""}`.trim()}>
        {Array.from({ length: fields }).map((_, index) => (
          <FieldSkeleton key={index} />
        ))}
      </div>
    </section>
  );
}

/* — page-level archetypes — */

/** Server-side list page: header, optional stat cards, filter panel, table panel, pagination. */
export function BpListPageSkeleton({
  columns = 6,
  rows = 8,
  selects = 1,
  minWidth = 720,
  withAction = false,
  readOnly = false,
  paginated = true,
  stats = 0,
  statColumns,
}: {
  columns?: number;
  rows?: number;
  selects?: number;
  minWidth?: number;
  withAction?: boolean;
  readOnly?: boolean;
  paginated?: boolean;
  stats?: number;
  statColumns?: string;
}) {
  return (
    <div className="flex animate-pulse flex-col gap-2" aria-hidden>
      <BpPageHeaderSkeleton flush withAction={withAction} />
      {stats > 0 && <BpStatCardsSkeleton count={stats} columns={statColumns ?? "sm:grid-cols-2 xl:grid-cols-4"} />}
      <Frame>
        <BpFilterBarSkeleton selects={selects} />
      </Frame>
      <Frame>
        {readOnly && (
          <div className="flex items-center justify-between gap-3 border-b border-[var(--bp-divider)] px-4 py-3">
            <BpBar className="h-3 w-56 max-w-[60%]" />
            <BpBar className="h-8 w-8 shrink-0" />
          </div>
        )}
        <BpTableSkeleton columns={columns} rows={rows} minWidth={minWidth} />
        {paginated && <BpPaginationSkeleton />}
      </Frame>
    </div>
  );
}

/** Two-pane manager (attribute editors): header, a narrow selector list beside a wide editor. */
export function BpSplitPaneSkeleton({ listRows = 8, editorSections = 3 }: { listRows?: number; editorSections?: number }) {
  return (
    <div className="flex animate-pulse flex-col gap-2" aria-hidden>
      <BpPageHeaderSkeleton flush />
      <div className="grid grid-cols-1 items-start gap-2 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Frame className="p-[18px]">
          <BpBar className="h-9 w-full" />
          <div className="mt-3 flex flex-col gap-1.5">
            {Array.from({ length: listRows }).map((_, index) => (
              <BpBar key={index} className="h-11 w-full" />
            ))}
          </div>
        </Frame>
        <Frame className="p-[18px]">
          <BpBar className="h-2.5 w-40" />
          <div className="mt-4 flex flex-col gap-4">
            {Array.from({ length: editorSections }).map((_, index) => (
              <div key={index} className="flex flex-col gap-2.5 border border-[var(--bp-divider)] p-3">
                <BpBar className="h-2.5 w-28" />
                <BpBar className="h-9 w-full" />
                <BpBar className="h-9 w-full" />
              </div>
            ))}
          </div>
        </Frame>
      </div>
    </div>
  );
}

/** Client config list with the compact form beside the table (brands, categories, colours…). */
export function BpFormBesideTableSkeleton({ columns = 7, rows = 6, formFields = 5, selects = 3 }: { columns?: number; rows?: number; formFields?: number; selects?: number }) {
  return (
    <div className="flex animate-pulse flex-col gap-2" aria-hidden>
      <BpPageHeaderSkeleton flush />
      <div className="grid items-start gap-2 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Frame className="p-[18px]">
          <div className="grid gap-3">
            {Array.from({ length: formFields }).map((_, index) => (
              <FieldSkeleton key={index} />
            ))}
          </div>
          <BpBar className="mt-4 h-9 w-full" />
        </Frame>
        <Frame>
          <BpFilterBarSkeleton selects={selects} />
          <BpTableSkeleton columns={columns} rows={rows} minWidth={640} />
        </Frame>
      </div>
    </div>
  );
}

/** Heavy form route (product, promotion, shipping method…): header with back link, framed
 *  sections, a trailing action bar. `sections` gives the field count of each section. */
export function BpFormPageSkeleton({ sections = [4, 3], columns = 2, withBack = true, withActionBar = true }: { sections?: number[]; columns?: 1 | 2; withBack?: boolean; withActionBar?: boolean }) {
  return (
    <div className="animate-pulse" aria-hidden>
      <BpPageHeaderSkeleton withBack={withBack} />
      <div className="grid gap-2">
        {sections.map((fields, index) => (
          <BpFormSectionSkeleton key={index} fields={fields} columns={columns} />
        ))}
        {withActionBar && (
          <section className="bp-frame relative flex flex-col gap-3 p-[18px] sm:flex-row sm:items-center sm:justify-between">
            <BpBar className="h-2.5 w-64 max-w-[60%]" />
            <BpBar className="h-9 w-32" />
          </section>
        )}
      </div>
    </div>
  );
}

function DetailBlockSkeleton({ lines = 5, lineClass = "h-4" }: { lines?: number; lineClass?: string }) {
  return (
    <div className="bp-frame relative p-[18px]">
      <BpBar className="h-2.5 w-32" />
      <div className="mt-4 flex flex-col gap-2.5">
        {Array.from({ length: lines }).map((_, index) => (
          <BpBar key={index} className={`${lineClass} w-full`} />
        ))}
      </div>
    </div>
  );
}

/** Record detail route (order, return, payment, review…): header with back link, wide main
 *  column of framed blocks, narrow aside column. */
export function BpDetailPageSkeleton({ mainBlocks = 2, asideBlocks = 2, withAction = false, aside = "360px" }: { mainBlocks?: number; asideBlocks?: number; withAction?: boolean; aside?: string }) {
  return (
    <div className="flex animate-pulse flex-col gap-4" aria-hidden>
      <BpPageHeaderSkeleton withBack withAction={withAction} />
      <div className="grid gap-4" style={{ gridTemplateColumns: `minmax(0,1fr) ${aside}` }}>
        <div className="grid content-start gap-4">
          {Array.from({ length: mainBlocks }).map((_, index) => (
            <DetailBlockSkeleton key={index} lines={index === 0 ? 4 : 5} />
          ))}
        </div>
        <div className="grid content-start gap-4">
          {Array.from({ length: asideBlocks }).map((_, index) => (
            <DetailBlockSkeleton key={index} lines={4} lineClass="h-3.5" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Settings hub route (settings index, homepage hub, notifications hub): header, optional tab
 *  strip, a responsive grid of link cards. */
export function BpSettingsHubSkeleton({ tabs = 0, cards = 6, withBack = false }: { tabs?: number; cards?: number; withBack?: boolean }) {
  return (
    <div className="animate-pulse" aria-hidden>
      <BpPageHeaderSkeleton withBack={withBack} />
      <section className="bp-frame relative overflow-hidden">
        {tabs > 0 && (
          <div className="flex gap-2 border-b border-[var(--bp-divider)] px-4 py-2.5">
            {Array.from({ length: tabs }).map((_, index) => (
              <BpBar key={index} className="h-6 w-28" />
            ))}
          </div>
        )}
        <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: cards }).map((_, index) => (
            <div key={index} className="bp-frame flex items-center gap-3 p-[14px]">
              <BpBar className="size-9 shrink-0" />
              <div className="flex flex-1 flex-col gap-1.5">
                <BpBar className="h-3 w-24" />
                <BpBar className="h-2 w-full" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
