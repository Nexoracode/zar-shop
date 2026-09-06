"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import type { UserRole } from "@generated/prisma/enums";
import { includesNormalizedText } from "@/lib/text-search";
import { visibleAdminSearchIndex, type AdminSearchEntry } from "@/modules/admin/search-index";
import { BpButton } from "./ui/button";
import { BpPopover } from "./ui/popover";

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
 * Panel-wide "settings search" pinned in the header, centred like a real search field rather than
 * hidden behind an icon. Its results drop down anchored directly under the field itself (via
 * `BpPopover`, so outside-click/Escape are already handled) while a dim backdrop below the header
 * pushes focus onto it — the header row itself stays undimmed and interactive.
 */
export function AdminGlobalSearch({ role }: { role: UserRole }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  // The popover anchors to the whole field wrapper, not just the input — otherwise the clear
  // button beside it (a sibling, not a descendant of the input) would read as an "outside" click
  // to BpPopover's own detection and close the results before its own onClick ever fires.
  const wrapperRef = useRef<HTMLDivElement>(null);
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

  function go(entry: AdminSearchEntry) {
    setOpen(false);
    setQuery("");
    router.push(entry.href);
  }

  // Ctrl/Cmd+K focuses the field from anywhere in the admin — focus itself opens the popover.
  useEffect(() => {
    function onGlobalKeyDown(event: globalThis.KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onGlobalKeyDown);
    return () => document.removeEventListener("keydown", onGlobalKeyDown);
  }, []);

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") { setOpen(false); return; }
    if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((current) => Math.min(current + 1, results.length - 1)); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((current) => Math.max(current - 1, 0)); }
    if (event.key === "Enter") { event.preventDefault(); const entry = results[activeIndex]; if (entry) go(entry); }
  }

  return (
    <div className="min-w-0 flex-1">
      {/* Dims everything below the header so the field and its dropdown read as the focused
          layer — the header row itself is never covered, so it stays fully usable. */}
      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-x-0 bottom-0 top-12 z-[135] bg-[color-mix(in_srgb,#0b0c0d_70%,transparent)]" aria-hidden />,
        document.body,
      )}

      <div ref={wrapperRef} className="relative mx-auto w-full max-w-[420px]">
        <Search size={15} className="bp-muted pointer-events-none absolute start-2.5 top-1/2 z-10 -translate-y-1/2" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); setOpen(true); }}
          onKeyDown={onInputKeyDown}
          placeholder="جستجو در پنل مدیریت... (Ctrl+K)"
          className="bp-input bp-input-search w-full"
          aria-label="جستجو در پنل مدیریت"
          role="combobox"
          aria-expanded={open}
          aria-controls="admin-search-results"
        />
        {query ? (
          <BpButton isIconOnly size="sm" variant="ghost" aria-label="پاک‌کردن جستجو" onClick={() => { setQuery(""); inputRef.current?.focus(); }} className="absolute end-1 top-1/2 z-10 h-7 min-h-7 w-7 min-w-7 -translate-y-1/2">
            <X size={14} />
          </BpButton>
        ) : null}

        <BpPopover open={open} anchorRef={wrapperRef} onClose={() => setOpen(false)} label="نتایج جستجو" width={420}>
          <div id="admin-search-results" role="listbox" aria-label="نتایج جستجو" className="bp-scroll max-h-[60vh] overflow-y-auto">
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
        </BpPopover>
      </div>
    </div>
  );
}
