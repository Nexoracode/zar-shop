"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import type { UserRole } from "@generated/prisma/enums";
import { includesNormalizedText } from "@/lib/text-search";
import { visibleAdminSearchIndex, type AdminSearchEntry } from "@/modules/admin/search-index";
import { lockBodyScroll, unlockBodyScroll } from "./ui/dialog";
import { BpButton } from "./ui/button";

function matches(entry: AdminSearchEntry, query: string) {
  return includesNormalizedText(entry.title, query)
    || includesNormalizedText(entry.description, query)
    || includesNormalizedText(entry.group, query)
    || entry.keywords.some((keyword) => includesNormalizedText(keyword, query));
}

function ResultRow({ entry, active, onHover, onSelect }: { entry: AdminSearchEntry; active: boolean; onHover: () => void; onSelect: () => void }) {
  const Icon = entry.icon;
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onMouseEnter={onHover}
      onClick={onSelect}
      className={`flex w-full items-center gap-2.5 border border-transparent px-2.5 py-2 text-start ${active ? "bg-[var(--bp-hover)]" : ""}`}
    >
      <span className="grid size-8 shrink-0 place-items-center border border-[var(--bp-divider)] text-[var(--bp-accent)]"><Icon size={15} strokeWidth={1.5} /></span>
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-[13px]">{entry.title}</strong>
        <span className="bp-muted block truncate text-[11px]">{entry.description}</span>
      </span>
    </button>
  );
}

/**
 * Panel-wide "settings search" for the admin — one box that reaches every page and settings
 * sub-page the reader has permission for, not just the top-level nav items. Opens from the header
 * icon or Ctrl/Cmd+K from anywhere in the admin.
 */
export function AdminGlobalSearch({ role }: { role: UserRole }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const entries = useMemo(() => visibleAdminSearchIndex(role), [role]);

  const results = useMemo(() => {
    const trimmed = query.trim();
    return trimmed ? entries.filter((entry) => matches(entry, trimmed)) : entries;
  }, [entries, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, AdminSearchEntry[]>();
    for (const entry of results) map.set(entry.group, [...(map.get(entry.group) ?? []), entry]);
    return [...map.entries()];
  }, [results]);

  function close() {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }

  function go(entry: AdminSearchEntry) {
    close();
    router.push(entry.href);
  }

  useEffect(() => {
    function onGlobalKeyDown(event: globalThis.KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener("keydown", onGlobalKeyDown);
    return () => document.removeEventListener("keydown", onGlobalKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    lockBodyScroll();
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => { unlockBodyScroll(); cancelAnimationFrame(frame); };
  }, [open]);

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") { close(); return; }
    if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((current) => Math.min(current + 1, results.length - 1)); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((current) => Math.max(current - 1, 0)); }
    if (event.key === "Enter") { event.preventDefault(); const entry = results[activeIndex]; if (entry) go(entry); }
  }

  return (
    <>
      <BpButton isIconOnly size="sm" aria-label="جستجو در پنل مدیریت" title="جستجو (Ctrl+K)" onClick={() => setOpen(true)}>
        <Search size={15} />
      </BpButton>

      {open && typeof document !== "undefined" && createPortal(
        <div
          dir="rtl"
          className="bp-root fixed inset-0 z-[130] flex items-start justify-center bg-[color-mix(in_srgb,#0b0c0d_55%,transparent)] p-4 pt-[12vh]"
          onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}
        >
          <div className="bp-frame flex max-h-[70vh] w-full max-w-[560px] flex-col overflow-hidden">
            <div className="flex items-center gap-2.5 border-b border-[var(--bp-divider)] p-3">
              <Search size={17} className="bp-muted shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
                onKeyDown={onInputKeyDown}
                placeholder="جستجو در محصولات، سفارش‌ها، تنظیمات..."
                className="min-w-0 flex-1 border-none bg-transparent text-[14px] text-[var(--bp-text)] outline-none placeholder:text-[var(--bp-muted)]"
                aria-label="جستجو در پنل مدیریت"
                role="combobox"
                aria-expanded="true"
                aria-controls="admin-search-results"
              />
              <BpButton isIconOnly size="sm" variant="ghost" aria-label="بستن جستجو" onClick={close}><X size={15} strokeWidth={1.5} /></BpButton>
            </div>
            <div id="admin-search-results" role="listbox" aria-label="نتایج جستجو" className="bp-scroll flex-1 overflow-y-auto p-2">
              {grouped.length ? grouped.map(([group, items]) => (
                <div key={group} className="mb-2 last:mb-0">
                  <div className="bp-kicker px-2.5 py-1">{group}</div>
                  {items.map((entry) => (
                    <ResultRow key={entry.id} entry={entry} active={results.indexOf(entry) === activeIndex} onHover={() => setActiveIndex(results.indexOf(entry))} onSelect={() => go(entry)} />
                  ))}
                </div>
              )) : (
                <div className="grid place-items-center px-5 py-10 text-center">
                  <strong className="text-[13px]">چیزی پیدا نشد</strong>
                  <span className="bp-muted mt-1 text-[11px]">عبارت دیگری را امتحان کنید.</span>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
