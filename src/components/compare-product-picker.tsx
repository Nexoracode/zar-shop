"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Modal, Spinner } from "@heroui/react";
import { PackageSearch, Search } from "lucide-react";
import type { ComparePickerItem } from "@/modules/compare/service";

type PickerData = { items: ComparePickerItem[]; total: number };
const EMPTY: PickerData = { items: [], total: 0 };

/**
 * The "انتخاب کالا برای مقایسه" modal — a searchable grid of comparable products. When the compare
 * list already has an item, `categoryId` keeps the results to that category; `excludeIds` drops
 * whatever is already picked.
 */
export function CompareProductPicker({ open, onOpenChange, categoryId, excludeIds, onPick }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string | null;
  excludeIds: string[];
  onPick: (item: ComparePickerItem) => void;
}) {
  const [term, setTerm] = useState("");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<PickerData>(EMPTY);
  const [loading, setLoading] = useState(false);
  const excludeKey = useMemo(() => [...excludeIds].sort().join(","), [excludeIds]);

  // Debounce the typed term into the term actually sent to the server.
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(term.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [term]);

  function handleOpenChange(next: boolean) {
    if (!next) { setTerm(""); setQuery(""); setData(EMPTY); }
    onOpenChange(next);
  }

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    let cancelled = false;

    async function run() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        if (categoryId) params.set("categoryId", categoryId);
        if (excludeKey) params.set("exclude", excludeKey);
        const response = await fetch(`/api/compare/pick?${params.toString()}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("picker request failed");
        const result: PickerData = await response.json();
        if (!cancelled) setData(result);
      } catch {
        /* aborted or offline */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => { cancelled = true; controller.abort(); };
  }, [open, query, categoryId, excludeKey]);

  return (
    <Modal.Backdrop isOpen={open} onOpenChange={handleOpenChange} isDismissable>
      <Modal.Container size="lg" placement="center" scroll="inside">
        <Modal.Dialog aria-label="انتخاب کالا برای مقایسه" dir="rtl" className="w-[min(920px,96vw)]">
          <Modal.Header className="pl-10">
            <Modal.Heading className="text-base font-bold">انتخاب کالا برای مقایسه</Modal.Heading>
            <Modal.CloseTrigger aria-label="بستن" className="left-4 right-auto" />
          </Modal.Header>
          <Modal.Body>
            <div className="relative">
              <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="search"
                autoFocus
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="جستجو در کالاها..."
                aria-label="جستجوی کالا"
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-10 pr-4 text-sm outline-none transition focus:border-[var(--brand-primary)]"
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-[var(--muted)]">
              <span>{query ? "نتایج جستجو" : "برترین کالاها برای مقایسه"}</span>
              <span>{data.total.toLocaleString("fa-IR")} کالا</span>
            </div>

            {loading && data.items.length === 0 ? (
              <div className="grid min-h-56 place-items-center"><Spinner size="md" /></div>
            ) : data.items.length === 0 ? (
              <div className="grid min-h-56 place-items-center px-6 text-center text-sm text-[var(--muted)]">
                <div>
                  <PackageSearch size={38} className="mx-auto text-[var(--muted)]" />
                  <p className="mb-0 mt-3">{query ? "کالایی با این جستجو پیدا نشد." : categoryId ? "کالای دیگری برای مقایسه در این دسته‌بندی نیست." : "کالایی برای نمایش نیست."}</p>
                </div>
              </div>
            ) : (
              <ul className="m-0 mt-3 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3">
                {data.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => { onPick(item); handleOpenChange(false); }}
                      className="flex h-full w-full flex-col rounded-xl border border-[var(--border)] bg-white p-3 text-right transition hover:border-[var(--brand-primary)] hover:shadow-sm"
                    >
                      <span className="flex min-h-4 items-center">
                        {item.onSale && <span className="text-[11px] font-bold text-[var(--danger)]">فروش ویژه</span>}
                      </span>
                      <span className="relative mx-auto my-2 grid aspect-square w-full max-w-[130px] place-items-center overflow-hidden">
                        {item.image ? <Image src={item.image} alt={item.name} width={220} height={220} className="size-full object-contain" /> : <PackageSearch size={26} className="text-[var(--muted)]" />}
                      </span>
                      <span className="line-clamp-2 min-h-9 text-[11px] font-bold leading-5 text-[var(--foreground)]">{item.name}</span>
                      {item.price && <strong className="mt-1 block text-[12px] font-bold text-[var(--brand-primary)]">{item.price}</strong>}
                      {item.chips.length > 0 && (
                        <span className="mt-2 flex flex-wrap gap-1">
                          {item.chips.map((chip, index) => (
                            <span key={index} className="max-w-full truncate rounded-md bg-[color-mix(in_srgb,var(--brand-accent)_10%,var(--surface))] px-1.5 py-0.5 text-[10px] font-bold text-[var(--brand-accent)]">{chip}</span>
                          ))}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
