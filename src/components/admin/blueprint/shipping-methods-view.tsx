"use client";

import Link from "next/link";
import { useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { GripVertical, Pencil } from "lucide-react";
import { AdminEmptyState, AdminPanel, AdminStatusBadge } from "@/components/admin-ui";
import { AdminBulkCheckbox, AdminBulkEditor, AdminBulkTr } from "@/components/admin-bulk-editor";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { normalizeSearchText } from "@/lib/text-search";
import { BpListFilters, BpTable, BpTd, BpTh } from "./ui";
import { ShippingMethodDeleteButton } from "./shipping-method-delete-button";

export type ShippingMethodRow = {
  id: string;
  title: string;
  carrier: string;
  source: string;
  estimatedDays: number;
  isActive: boolean;
  zoneCount: number;
  orderCount: number;
  sortOrder: number;
};

/** A live rate still needs table rows behind it, so the column reports both together. */
function sourceLabel(method: ShippingMethodRow) {
  if (method.source !== "TAPIN") return "جدول نرخ فروشگاه";
  return method.zoneCount ? "نرخ لحظه‌ای، با نرخ پشتیبان" : "نرخ لحظه‌ای، بدون پشتیبان";
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || to >= list.length) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function BlueprintShippingMethodsView({ methods }: { methods: ShippingMethodRow[] }) {
  const router = useRouter();
  const [items, setItems] = useState(methods);
  // The server list is the source of truth once a mutation settles and `router.refresh()` brings
  // a fresh copy; this render-time sync (not an effect) picks it up without an extra render pass.
  const [prevMethods, setPrevMethods] = useState(methods);
  if (methods !== prevMethods) {
    setPrevMethods(methods);
    setItems(methods);
  }
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [savingOrder, setSavingOrder] = useState(false);

  const normalizedQuery = normalizeSearchText(query);
  const filtersActive = Boolean(normalizedQuery || statusFilter || sourceFilter);
  const visible = items.filter((method) => {
    if (normalizedQuery && !normalizeSearchText(`${method.title} ${method.carrier}`).includes(normalizedQuery)) return false;
    if (statusFilter === "active" && !method.isActive) return false;
    if (statusFilter === "inactive" && method.isActive) return false;
    if (sourceFilter && method.source !== sourceFilter) return false;
    return true;
  });

  /** Renumbers `next` sequentially and pushes only the rows whose position actually moved. */
  async function persistOrder(next: ShippingMethodRow[], previous: ShippingMethodRow[]) {
    const numbered = next.map((item, position) => ({ ...item, sortOrder: position }));
    const changed = numbered.filter((item, position) => previous.find((entry) => entry.id === item.id)?.sortOrder !== position);
    setItems(numbered);
    if (!changed.length) return;
    setSavingOrder(true);
    try {
      await Promise.all(changed.map((item) => requestJson(`/api/admin/shipping-methods/${item.id}/sort-order`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: item.sortOrder }),
      }, { fallbackMessage: "ذخیره ترتیب روش‌های ارسال انجام نشد." })));
      router.refresh();
    } catch (reason) {
      setItems(previous);
      toast.danger("ذخیره ترتیب روش‌های ارسال انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد.") });
    } finally {
      setSavingOrder(false);
    }
  }

  // Rows reorder live as the pointer passes over them; `dragOrigin` keeps the list from before
  // the gesture started, so `endDrag` only has to diff the two snapshots once, on release.
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const dragOrigin = useRef<ShippingMethodRow[] | null>(null);

  function beginDrag(id: string) {
    if (savingOrder) return;
    dragOrigin.current = items;
    setDraggedId(id);
  }

  function dragOver(event: DragEvent<HTMLElement>, overId: string) {
    event.preventDefault();
    if (!draggedId || draggedId === overId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const after = event.clientY > bounds.top + bounds.height / 2;
    setItems((current) => {
      const from = current.findIndex((item) => item.id === draggedId);
      const overIndex = current.findIndex((item) => item.id === overId);
      if (from < 0 || overIndex < 0) return current;
      // Where the dragged row should land in `current`, before `move` splices it out of `from` —
      // that removal closes a gap ahead of any index past it, so a target past `from` has to
      // shift back by one to still land in the same visual spot.
      let target = after ? overIndex + 1 : overIndex;
      if (target > from) target -= 1;
      return move(current, from, target);
    });
  }

  function endDrag() {
    const origin = dragOrigin.current;
    setDraggedId(null);
    dragOrigin.current = null;
    if (origin) void persistOrder(items, origin);
  }

  return (
    <AdminPanel>
      {methods.length ? (
        <>
          <BpListFilters
            query={query}
            onQueryChange={setQuery}
            searchLabel="جستجوی روش ارسال"
            searchPlaceholder="جستجو بر اساس نام روش یا شرکت حمل"
            filters={[
              { name: "status", ariaLabel: "وضعیت روش ارسال", value: statusFilter, onChange: setStatusFilter, options: [{ value: "", label: "همه وضعیت‌ها" }, { value: "active", label: "فعال" }, { value: "inactive", label: "غیرفعال" }] },
              { name: "source", ariaLabel: "منبع نرخ", value: sourceFilter, onChange: setSourceFilter, options: [{ value: "", label: "همه منابع نرخ" }, { value: "TABLE", label: "جدول نرخ فروشگاه" }, { value: "TAPIN", label: "نرخ لحظه‌ای تاپین" }] },
            ]}
          />

          {visible.length ? (
            <>
              <p className="m-0 flex items-center gap-1.5 border-b border-[var(--bp-divider)] px-4 py-2 text-[12px] text-[var(--bp-info)]">{filtersActive ? "برای تغییر ترتیب نمایش، ابتدا جستجو و فیلترها را پاک کنید." : "با کشیدن ردیف، ترتیب نمایش روش‌ها را در تسویه حساب تنظیم کنید."}</p>

              <div className="md:hidden">
                {visible.map((method) => (
                  <article
                    key={method.id}
                    draggable={!savingOrder && !filtersActive}
                    onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; beginDrag(method.id); }}
                    onDragOver={(event) => dragOver(event, method.id)}
                    onDrop={(event) => event.preventDefault()}
                    onDragEnd={endDrag}
                    className={`flex flex-col gap-3 border-b border-[var(--bp-row-line)] p-4 last:border-b-0 ${draggedId === method.id ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <span aria-hidden="true" title="برای جابه‌جایی بکشید" className="bp-muted mt-0.5 shrink-0 cursor-grab active:cursor-grabbing"><GripVertical size={15} /></span>
                      <div className="min-w-0 flex-1">
                        <strong className="block truncate text-[13px]">{method.title}</strong>
                        <span className="bp-muted mt-0.5 block truncate text-[11px]">{method.carrier} · {sourceLabel(method)}</span>
                      </div>
                      <AdminStatusBadge tone={method.isActive ? "success" : "neutral"}>{method.isActive ? "فعال" : "غیرفعال"}</AdminStatusBadge>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="bp-muted text-[11px]">{method.estimatedDays.toLocaleString("fa-IR")} روز کاری</span>
                      <div className="flex items-center gap-1">
                        <Link href={`/admin/shipping-methods/${method.id}/edit`} aria-label={`ویرایش ${method.title}`} className="bp-btn bp-btn-ghost bp-btn-icon bp-btn-sm"><Pencil size={14} /></Link>
                        <ShippingMethodDeleteButton id={method.id} title={method.title} orderCount={method.orderCount} />
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <AdminBulkEditor entity="shippingMethods" entityLabel="روش ارسال" ids={visible.map((method) => method.id)} actions={[{ value: "active:on", label: "فعال‌کردن روش‌ها" }, { value: "active:off", label: "غیرفعال‌کردن روش‌ها" }]}>
                <BpTable ariaLabel="فهرست روش‌های ارسال" minWidth={800}>
                  <thead>
                    <tr>
                      <BpTh className="w-8 text-center"><span className="sr-only">جابه‌جایی</span></BpTh>
                      <BpTh className="w-10 text-center"><span className="sr-only">انتخاب</span></BpTh>
                      <BpTh>روش ارسال</BpTh>
                      <BpTh>شرکت حمل</BpTh>
                      <BpTh>منبع نرخ</BpTh>
                      <BpTh>زمان تحویل</BpTh>
                      <BpTh>وضعیت</BpTh>
                      <BpTh className="text-center">عملیات</BpTh>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((method) => (
                      <AdminBulkTr
                        key={method.id}
                        id={method.id}
                        draggable={!savingOrder && !filtersActive}
                        onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; beginDrag(method.id); }}
                        onDragOver={(event) => dragOver(event, method.id)}
                        onDrop={(event) => event.preventDefault()}
                        onDragEnd={endDrag}
                        className={draggedId === method.id ? "opacity-50" : undefined}
                      >
                        <BpTd className="w-8 text-center"><span aria-hidden="true" title="برای جابه‌جایی بکشید" className="bp-muted inline-flex cursor-grab active:cursor-grabbing"><GripVertical size={15} /></span></BpTd>
                        <BpTd className="w-10 text-center"><AdminBulkCheckbox id={method.id} label={`انتخاب ${method.title}`} /></BpTd>
                        <BpTd className="max-w-[220px] truncate font-bold" title={method.title}>{method.title}</BpTd>
                        <BpTd>{method.carrier}</BpTd>
                        <BpTd className="bp-muted">{sourceLabel(method)}</BpTd>
                        <BpTd>{method.estimatedDays.toLocaleString("fa-IR")} روز کاری</BpTd>
                        <BpTd><AdminStatusBadge tone={method.isActive ? "success" : "neutral"}>{method.isActive ? "فعال" : "غیرفعال"}</AdminStatusBadge></BpTd>
                        <BpTd>
                          <div className="flex items-center justify-center gap-1">
                            <Link href={`/admin/shipping-methods/${method.id}/edit`} title="ویرایش روش ارسال" aria-label={`ویرایش ${method.title}`} className="bp-btn bp-btn-ghost bp-btn-icon bp-btn-sm"><Pencil size={14} /></Link>
                            <ShippingMethodDeleteButton id={method.id} title={method.title} orderCount={method.orderCount} />
                          </div>
                        </BpTd>
                      </AdminBulkTr>
                    ))}
                  </tbody>
                </BpTable>
              </AdminBulkEditor>
            </>
          ) : <div className="p-6"><AdminEmptyState title="روشی پیدا نشد" description="هیچ روش ارسالی با جستجو و فیلترهای انتخابی مطابقت ندارد." /></div>}
        </>
      ) : <AdminEmptyState title="روش ارسالی ثبت نشده" description="تا وقتی هیچ روشی تعریف نشده باشد، تسویه حساب همان هزینه ثابت تنظیمات را اعمال می‌کند." />}
    </AdminPanel>
  );
}
