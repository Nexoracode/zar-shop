"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Settings } from "lucide-react";
import { getHiddenColumns, setHiddenColumns, subscribeToHiddenColumns } from "@/lib/admin-column-visibility";
import { BpButton } from "@/components/admin/blueprint/ui/button";
import { BpCheckbox } from "@/components/admin/blueprint/ui/checkbox";
import { BpPopover } from "@/components/admin/blueprint/ui/popover";

export type AdminColumnDef = { id: string; label: string };

type ColumnVisibilityContextValue = { hidden: Set<string>; toggle: (id: string) => void; columns: AdminColumnDef[] };

const ColumnVisibilityContext = createContext<ColumnVisibilityContextValue | null>(null);

/**
 * Wraps a table (its toolbar and its `<thead>`/`<tbody>`) so `AdminColumn` cells inside can hide
 * themselves and `AdminColumnSettingsButton` can offer the checklist that controls them.
 *
 * Hidden columns live in a cookie rather than localStorage so the server can read it and render
 * the right columns on the very first paint — same reasoning as `admin-sidebar-state.ts` and
 * `admin-theme.ts` for the rail width and theme. `initialHidden` is that server read, passed back
 * in as `useSyncExternalStore`'s server snapshot so hydration never has to correct a flash of
 * columns that were about to disappear anyway.
 */
export function AdminColumnVisibility({ tableId, columns, initialHidden, children }: { tableId: string; columns: AdminColumnDef[]; initialHidden: string[]; children: ReactNode }) {
  const serverSnapshot = useCallback(() => initialHidden, [initialHidden]);
  const subscribe = useCallback((callback: () => void) => subscribeToHiddenColumns(tableId, callback), [tableId]);
  const getSnapshot = useCallback(() => getHiddenColumns(tableId), [tableId]);
  const hiddenList = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
  const hidden = useMemo(() => new Set(hiddenList), [hiddenList]);

  const toggle = useCallback((id: string) => {
    const next = hidden.has(id) ? hiddenList.filter((item) => item !== id) : [...hiddenList, id];
    setHiddenColumns(tableId, next);
  }, [hidden, hiddenList, tableId]);

  const value = useMemo<ColumnVisibilityContextValue>(() => ({ hidden, toggle, columns }), [hidden, toggle, columns]);
  return <ColumnVisibilityContext.Provider value={value}>{children}</ColumnVisibilityContext.Provider>;
}

function useColumnVisibility() {
  const context = useContext(ColumnVisibilityContext);
  if (!context) throw new Error("AdminColumn must be used inside AdminColumnVisibility");
  return context;
}

/** Wraps one `<th>`/`<td>` (via `BpTh`/`BpTd`); renders nothing while that column is hidden. */
export function AdminColumn({ id, children }: { id: string; children: ReactNode }) {
  const { hidden } = useColumnVisibility();
  if (hidden.has(id)) return null;
  return <>{children}</>;
}

/** The gear trigger — pass as `AdminBulkEditor`'s `beforeSelectAll`. */
export function AdminColumnSettingsButton() {
  const { hidden, toggle, columns } = useColumnVisibility();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <BpButton
        ref={triggerRef}
        isIconOnly
        variant="ghost"
        size="sm"
        title="تنظیم ستون‌های جدول"
        aria-label="تنظیم ستون‌های جدول"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Settings size={15} strokeWidth={1.5} />
      </BpButton>
      <BpPopover open={open} anchorRef={triggerRef} onClose={() => setOpen(false)} label="تنظیم ستون‌های جدول" width={210}>
        <p className="bp-muted m-0 mb-2 text-[12px]">نمایش ستون‌ها</p>
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {columns.map((column) => (
            <li key={column.id}>
              <BpCheckbox isSelected={!hidden.has(column.id)} onChange={() => toggle(column.id)}>{column.label}</BpCheckbox>
            </li>
          ))}
        </ul>
      </BpPopover>
    </>
  );
}
