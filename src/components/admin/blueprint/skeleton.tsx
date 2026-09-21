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
export function BpPageHeaderSkeleton({ withBack = false, withAction = false, flush = false, actionClassName = "h-9 w-36" }: { withBack?: boolean; withAction?: boolean; flush?: boolean; /** Size of the action placeholder, for a page whose action is a wider control than a button. */ actionClassName?: string }) {
  return (
    <header className={`${flush ? "" : "mb-6"} flex flex-col gap-4 border-b border-[var(--bp-divider)] pb-2.5 sm:flex-row sm:items-center sm:justify-between`.trim()}>
      {/* Line boxes, not bare bars: the real header's back link, 24px title (with its own bottom margin) and 13px
          description take these heights, so the header is exactly as tall as the one that replaces it. */}
      <div className="min-w-0">
        {withBack && <div className="mb-2 flex h-5 items-center"><BpBar className="h-3 w-32" /></div>}
        <div className="mb-[7px] flex h-[29px] items-center"><BpBar className="h-5 w-48" /></div>
        <div className="mt-0.5 flex h-5 items-center"><BpBar className="h-3 w-72 max-w-full" /></div>
      </div>
      {withAction && <BpBar className={`shrink-0 ${actionClassName}`} />}
    </header>
  );
}

/** Placeholder for the shared search + filter bar (`AdminListFilters` / `BpListFilters`). */
export function BpFilterBarSkeleton({ selects = 0 }: { selects?: number }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[var(--bp-divider)] p-3">
      <BpBar className="h-9 w-full min-w-[180px] sm:w-auto sm:min-w-[220px] sm:flex-1" />
      {selects > 0 && <span aria-hidden className="mx-1 hidden h-6 w-px shrink-0 bg-[var(--bp-divider)] sm:block" />}
      {Array.from({ length: selects }).map((_, index) => (
        <BpBar key={index} className="h-9 w-full sm:w-44" />
      ))}
    </div>
  );
}

/** Placeholder for the filter panel that sits above a server list (`AdminListFilters` in its own frame). */
export function BpFilterPanelSkeleton({ selects = 0, className = "p-4", framed = true }: { selects?: number; className?: string; /** False when the bar sits inside a card that already has the frame. */ framed?: boolean }) {
  return (
    <div className={`${framed ? "bp-frame relative" : ""} ${className}`.trim()}>
      <div className="flex flex-wrap items-center gap-2">
        <BpBar className="h-9 w-full min-w-[180px] sm:w-auto sm:min-w-[220px] sm:flex-1" />
        {selects > 0 && <span aria-hidden className="mx-1 hidden h-6 w-px shrink-0 bg-[var(--bp-divider)] sm:block" />}
        {Array.from({ length: selects }).map((_, index) => (
          <BpBar key={index} className="h-9 w-full sm:w-44" />
        ))}
      </div>
    </div>
  );
}

/** Placeholder for `AdminBulkEditor`'s toolbar: column settings, select-all, hint, the bulk-edit button and refresh. */
export function BpBulkToolbarSkeleton({ settings = true, extra = true, showFrom = "md" }: { settings?: boolean; extra?: boolean; showFrom?: "md" | "lg" | "xl" }) {
  return (
    <div className={`${{ md: "hidden md:flex", lg: "hidden lg:flex", xl: "hidden xl:flex" }[showFrom]} flex-wrap items-center gap-3 border-b border-[var(--bp-divider)] px-4 py-3`}>
      <div className="me-auto flex items-center gap-4">
        {settings && <BpBar className="size-9 shrink-0" />}
        <BpBar className="h-[34px] w-32" />
        <BpBar className="h-3 w-48" />
      </div>
      {extra && <BpBar className="h-9 w-28" />}
      <BpBar className="size-9 shrink-0" />
    </div>
  );
}

/** Placeholder for `AdminReadOnlyTableToolbar`: the lock badge, its two text lines, column settings and refresh. */
export function BpReadOnlyToolbarSkeleton({ settings = true }: { settings?: boolean }) {
  return (
    <div className="hidden items-center gap-3 border-b border-[var(--bp-divider)] px-4 py-3 md:flex">
      {settings && <BpBar className="size-9 shrink-0" />}
      <BpBar className="size-9 shrink-0" />
      <div className="flex min-w-0 flex-col gap-1.5">
        <BpBar className="h-3 w-40" />
        <BpBar className="h-2.5 w-72 max-w-full" />
      </div>
      <div className="ms-auto flex items-center gap-2">
        <BpBar className="size-9 shrink-0" />
      </div>
    </div>
  );
}

/** Placeholder for a `BpTable` — header row plus `rows` body rows at `columns` wide. */
export function BpTableSkeleton({ columns = 5, rows = 8, minWidth = 640, leading = 0, trailing = false, rowHeight = 45 }: { columns?: number; rows?: number; minWidth?: number; /** Narrow leading columns — the selection checkbox and the row number. */ leading?: number; /** A narrow last column — the row actions. */ trailing?: boolean; /** Height of one body row, from the real row's tallest cell. */ rowHeight?: number }) {
  const cells = (row: boolean) => Array.from({ length: columns }).map((_, index) => {
    const narrow = index < leading;
    const last = trailing && index === columns - 1;
    const width = narrow ? "w-6 shrink-0" : last ? "w-16 shrink-0" : "flex-1";
    return <BpBar key={index} className={`${row ? "h-4" : "h-2.5"} ${width}`} />;
  });
  return (
    <div className="bp-table-scroll">
      <div style={{ minWidth }}>
        <div className="flex h-[31px] items-center gap-[13.6px] px-[20.4px] shadow-[inset_0_-1px_0_var(--bp-divider)]">{cells(false)}</div>
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} style={{ height: rowHeight }} className="flex items-center gap-[13.6px] border-b border-[var(--bp-row-line)] px-[20.4px]">{cells(true)}</div>
        ))}
      </div>
    </div>
  );
}

/** Placeholder for the list footer (`AdminPagination`) — rows-per-page picker + page stepper. */
export function BpPaginationSkeleton() {
  return (
    <div className="flex flex-col gap-3 border-t border-[var(--bp-divider)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <BpBar className="h-3 w-44" />
        <BpBar className="h-[30px] w-28" />
      </div>
      <div className="flex items-center justify-between gap-1 sm:justify-end">
        {Array.from({ length: 5 }).map((_, index) => <BpBar key={index} className="size-9 shrink-0" />)}
      </div>
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
      <div className="mb-[5px] flex h-[19px] items-center"><BpBar className="h-2.5 w-20" /></div>
      <BpBar className="h-9 w-full" />
      <div className="h-[22px]" />
    </div>
  );
}

type FormPart = "field" | "textarea" | "image" | "switch";

/** One control of a compact side form: a field with its reserved message line, a textarea, the
 *  thumbnail-and-button picker row, or a switch. */
function FormPartSkeleton({ part }: { part: FormPart }) {
  if (part === "field") return <FieldSkeleton />;
  if (part === "textarea") {
    return (
      <div>
        <div className="mb-[5px] flex h-[19px] items-center"><BpBar className="h-2.5 w-20" /></div>
        <BpBar className="h-[90px] w-full" />
        <div className="h-[22px]" />
      </div>
    );
  }
  if (part === "image") {
    return (
      <div>
        <div className="mb-1.5 flex h-[19px] items-center"><BpBar className="h-2.5 w-20" /></div>
        <div className="flex items-center gap-3"><BpBar className="size-12 shrink-0" /><BpBar className="h-[30px] w-32" /></div>
      </div>
    );
  }
  return <div className="flex h-6 items-center gap-2"><BpBar className="h-5 w-9 shrink-0" /><BpBar className="h-3 w-16" /></div>;
}

/** Placeholder for one framed form section — kicker, optional description, a grid of fields. */
export function BpFormSectionSkeleton({ fields = 4, columns = 2, withDescription = true }: { fields?: number; columns?: 1 | 2; withDescription?: boolean }) {
  return (
    <section className="bp-frame relative p-[18px]">
      <div className="flex h-4 items-center"><BpBar className="h-2.5 w-32" /></div>
      {withDescription && <div className="mt-1 flex h-6 items-center"><BpBar className="h-2 w-56 max-w-full" /></div>}
      <div className={`mt-3 grid gap-3 ${columns === 2 ? "sm:grid-cols-2" : ""}`.trim()}>
        {Array.from({ length: fields }).map((_, index) => (
          <FieldSkeleton key={index} />
        ))}
      </div>
    </section>
  );
}

/* — page-level archetypes — */

/** The summary cards above some lists. Each preset is one page's own grid: label line, then the figure. */
export function BpMetricCardsSkeleton({ preset }: { preset: "returns" | "reviews" | "comments" | "detailPair" | "detailQuad" }) {
  const spec = {
    detailPair: { count: 2, grid: "mb-5 grid gap-3 sm:grid-cols-2", card: "p-4", label: "mb-2 h-[19px]", value: "h-[25px]" },
    detailQuad: { count: 4, grid: "mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4", card: "p-4", label: "mb-2 h-[19px]", value: "h-[25px]" },
    returns: { count: 4, grid: "grid grid-cols-2 gap-2 xl:grid-cols-4", card: "p-[18px]", label: "h-[18px]", value: "mt-2 h-[34px]" },
    reviews: { count: 4, grid: "mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4", card: "p-4", label: "mb-2 h-[19px]", value: "h-[31px]" },
    comments: { count: 3, grid: "mb-5 grid gap-3 sm:grid-cols-3", card: "p-4", label: "mb-2 h-[19px]", value: "h-[31px]" },
  }[preset];
  return (
    <div className={spec.grid}>
      {Array.from({ length: spec.count }).map((_, index) => (
        <Frame key={index} className={spec.card}>
          <div className={`flex items-center justify-between gap-3 ${spec.label}`}><BpBar className="h-2.5 w-24" /><BpBar className="size-4 shrink-0" /></div>
          <div className={`flex items-center ${spec.value}`}><BpBar className="h-5 w-16" /></div>
        </Frame>
      ))}
    </div>
  );
}

/** One record on a phone: the list pages swap their table for cards below the breakpoint. */
function MobileCardsSkeleton({ rows, hideFrom }: { rows: number; hideFrom: "md" | "lg" | "xl" }) {
  return (
    <div className={{ md: "md:hidden", lg: "lg:hidden", xl: "xl:hidden" }[hideFrom]}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex flex-col gap-3 border-b border-[var(--bp-row-line)] p-4 last:border-b-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1.5"><BpBar className="h-2.5 w-20" /><BpBar className="h-4 w-32" /></div>
            <BpBar className="h-6 w-16" />
          </div>
          <div className="flex flex-col gap-1.5"><BpBar className="h-4 w-40" /><BpBar className="h-3 w-28" /></div>
          <div className="flex items-center justify-between gap-2"><BpBar className="h-3 w-32" /><BpBar className="h-4 w-20" /></div>
          <BpBar className="h-[30px] w-full" />
        </div>
      ))}
    </div>
  );
}

/**
 * Server-side list page: header, optional summary cards, the filter panel, then one panel holding
 * the toolbar, the table (cards on a phone) and the pagination footer.
 *
 * Two page rhythms exist. Most pages are `flush` — the header sits flush and a `gap-2` container spaces
 * the blocks. Older pages leave the header spaced (`mb-6`) and give each block its own `mb-5`, with a
 * roomier `sm:p-5` filter panel; `spaced` reproduces those.
 */
export function BpListPageSkeleton({
  columns = 6,
  rows = 8,
  minWidth = 720,
  withAction = false,
  spaced = false,
  filterSelects = 0,
  toolbar = "bulk",
  toolbarExtra = true,
  leading = 1,
  trailing = true,
  rowHeight = 45,
  metrics,
  paginated = true,
  cardBreak = "md",
  searchInCard = false,
}: {
  columns?: number;
  rows?: number;
  minWidth?: number;
  withAction?: boolean;
  spaced?: boolean;
  /** Dropdown filters beside the search field (most pages filter from the column headers instead, so 0). */
  filterSelects?: number;
  /** `bulk`: select-all + bulk edit + refresh. `readonly`: the lock badge + refresh. `none`: a bare table. */
  toolbar?: "bulk" | "readonly" | "none";
  toolbarExtra?: boolean;
  /** Narrow leading columns: the selection checkbox, plus the row number where the table has one. */
  leading?: number;
  trailing?: boolean;
  rowHeight?: number;
  metrics?: "returns" | "reviews" | "comments";
  paginated?: boolean;
  /** The breakpoint where the table replaces the phone cards. */
  cardBreak?: "md" | "lg" | "xl";
  /** The search field sits at the top of the table card, divided from it by a line, instead of in a card of its own. */
  searchInCard?: boolean;
}) {
  const tableWrapper = { md: "hidden md:block", lg: "hidden lg:block", xl: "hidden xl:block" }[cardBreak];
  return (
    <div className={`animate-pulse ${spaced ? "" : "flex flex-col gap-2"}`.trim()} aria-hidden>
      <BpPageHeaderSkeleton flush={!spaced} withAction={withAction} />
      {metrics && <BpMetricCardsSkeleton preset={metrics} />}
      {!searchInCard && <BpFilterPanelSkeleton selects={filterSelects} className={spaced ? "mb-5 p-4 sm:p-5" : "p-4"} />}
      <Frame>
        {searchInCard && <BpFilterPanelSkeleton selects={filterSelects} framed={false} className="border-b border-[var(--bp-divider)] p-4" />}
        {toolbar === "readonly" && <BpReadOnlyToolbarSkeleton />}
        <MobileCardsSkeleton rows={4} hideFrom={cardBreak} />
        <div className={tableWrapper}>
          {toolbar === "bulk" && <BpBulkToolbarSkeleton extra={toolbarExtra} showFrom={cardBreak} />}
          <BpTableSkeleton columns={columns} rows={rows} minWidth={minWidth} leading={leading} trailing={trailing} rowHeight={rowHeight} />
        </div>
        {paginated && <BpPaginationSkeleton />}
      </Frame>
    </div>
  );
}

/** A `p-[18px]` detail card. With `title`, it opens with the icon-and-heading row every such card carries. */
export function BpTitledCardSkeleton({ children, title = true, className = "" }: { children?: ReactNode; title?: boolean; className?: string }) {
  return (
    <section className={`bp-frame relative p-[18px] ${className}`.trim()}>
      {title && <div className="mb-3 flex h-5 items-center gap-2"><BpBar className="size-4 shrink-0" /><BpBar className="h-3 w-28" /></div>}
      {children}
    </section>
  );
}

/** `count` label-over-value pairs (the pages' `DetailItem`), stacked, or in two columns from `sm`. */
export function BpDetailItemsSkeleton({ count, twoColumns = false, className = "" }: { count: number; twoColumns?: boolean; className?: string }) {
  return (
    <div className={`grid gap-3 ${twoColumns ? "sm:grid-cols-2" : ""} ${className}`.trim()}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>
          <div className="flex h-[17px] items-center"><BpBar className="h-2.5 w-16" /></div>
          <div className="mt-1 flex h-5 items-center"><BpBar className="h-3.5 w-28" /></div>
        </div>
      ))}
    </div>
  );
}

/** A card that heads a table: icon, title and count in a `px-[18px] py-4` bar, then the table. */
export function BpTableCardSkeleton({ columns, rows, minWidth = 520 }: { columns: number; rows: number; minWidth?: number }) {
  return (
    <section className="bp-frame relative overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--bp-divider)] px-[18px] py-4">
        <BpBar className="size-4 shrink-0" />
        <BpBar className="h-3 w-28" />
        <BpBar className="h-2.5 w-10" />
      </div>
      <BpTableSkeleton columns={columns} rows={rows} minWidth={minWidth} leading={1} rowHeight={37} />
    </section>
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
export function BpFormBesideTableSkeleton({ columns = 7, rows = 6, form = ["field", "field", "switch"], leading = 2, rowHeight = 45, filterLeading = false }: { columns?: number; rows?: number; /** The side form's controls, top to bottom. */ form?: FormPart[]; leading?: number; rowHeight?: number; /** A column-settings button at the start of the search bar, for the list with no bulk toolbar. */ filterLeading?: boolean }) {
  return (
    <div className="flex animate-pulse flex-col gap-2" aria-hidden>
      <BpPageHeaderSkeleton flush />
      <div className="grid items-start gap-2 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside>
          <Frame className="p-[18px]">
            <div className="grid gap-3">
              {form.map((part, index) => <FormPartSkeleton key={index} part={part} />)}
            </div>
            <div className="mt-4 grid gap-2"><BpBar className="h-9 w-full" /></div>
          </Frame>
        </aside>
        <Frame>
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--bp-divider)] p-3">
            {filterLeading && <BpBar className="size-9 shrink-0" />}
            <BpBar className="h-9 w-full min-w-[180px] sm:w-auto sm:min-w-[220px] sm:flex-1" />
          </div>
          <MobileCardsSkeleton rows={3} hideFrom="md" />
          <div className="hidden md:block">
            {!filterLeading && <BpBulkToolbarSkeleton />}
            <BpTableSkeleton columns={columns} rows={rows} minWidth={640} leading={leading} trailing rowHeight={rowHeight} />
          </div>
        </Frame>
      </div>
    </div>
  );
}

/** A list that is one panel — search bar, an optional notice, phone cards, then the table with its bulk
 *  toolbar and no pagination (shipping methods, packaging). The header keeps its own bottom margin. */
export function BpPanelListSkeleton({ columns = 7, rows = 6, minWidth = 880, leading = 2, notice = false, rowHeight = 57 }: { columns?: number; rows?: number; minWidth?: number; leading?: number; notice?: boolean; rowHeight?: number }) {
  return (
    <div className="animate-pulse" aria-hidden>
      <BpPageHeaderSkeleton withAction />
      <Frame>
        <BpFilterBarSkeleton />
        {notice && <div className="flex h-9 items-center border-b border-[var(--bp-divider)] px-4"><BpBar className="h-3 w-80 max-w-full" /></div>}
        <MobileCardsSkeleton rows={3} hideFrom="md" />
        <div className="hidden md:block">
          <BpBulkToolbarSkeleton />
          <BpTableSkeleton columns={columns} rows={rows} minWidth={minWidth} leading={leading} trailing rowHeight={rowHeight} />
        </div>
      </Frame>
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

type FormPanel = { fields?: number; grid?: string; description?: boolean; /** A fixed-height block instead of fields — a gallery, an editor, an option grid. */ block?: number; action?: boolean };

function FormPanelSkeleton({ fields = 0, grid = "sm:grid-cols-2", description = false, block, action = false }: FormPanel) {
  return (
    <section className="bp-frame relative min-w-0 p-[18px]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex h-4 items-center"><BpBar className="h-2.5 w-32" /></div>
          {description && <div className="mt-1 flex h-6 items-center"><BpBar className="h-2 w-72 max-w-full" /></div>}
        </div>
        {action && <BpBar className="h-[30px] w-32 shrink-0" />}
      </div>
      <div className="mt-3">
        {block ? <div style={{ height: block }}><BpBar className="h-full w-full" /></div> : (
          <div className={`grid gap-3 ${grid}`}>
            {Array.from({ length: fields }).map((_, index) => <FieldSkeleton key={index} />)}
          </div>
        )}
      </div>
    </section>
  );
}

/** A form whose panels stack in a wide column beside a narrow, sticky sidebar panel (product, manual order). */
export function BpFormWithAsideSkeleton({ panels, header = "back", flush = false, aside = "320px", breakpoint = "lg", asidePanels = 1 }: { panels: FormPanel[]; header?: "back" | "plain"; flush?: boolean; aside?: string; breakpoint?: "lg" | "xl"; asidePanels?: number }) {
  const columns = breakpoint === "xl" ? "xl:grid-cols-[minmax(0,1fr)_var(--aside)]" : "lg:grid-cols-[minmax(0,1fr)_var(--aside)]";
  return (
    <div className={`animate-pulse ${flush ? "flex flex-col gap-2" : ""}`.trim()} aria-hidden>
      <BpPageHeaderSkeleton withBack={header === "back"} flush={flush} />
      <div className={`grid items-start gap-2 ${columns}`} style={{ "--aside": aside } as React.CSSProperties}>
        <div className="grid min-w-0 gap-2">
          {panels.map((panel, index) => <FormPanelSkeleton key={index} {...panel} />)}
        </div>
        <div className="grid gap-2">
          {Array.from({ length: asidePanels }).map((_, index) => (
            <section key={index} className="bp-frame relative p-[18px]">
              <div className="flex h-4 items-center"><BpBar className="h-2.5 w-24" /></div>
              <div className="mt-3"><BpBar className="h-9 w-full" /></div>
              <div className="mt-4 grid gap-2"><BpBar className="h-9 w-full" /><BpBar className="h-9 w-full" /></div>
            </section>
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
