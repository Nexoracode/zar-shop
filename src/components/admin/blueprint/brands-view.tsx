"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { GripVertical, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge } from "@/components/admin-ui";
import { AdminBulkCheckbox, AdminBulkEditor } from "@/components/admin-bulk-editor";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { BpButton, BpTable, BpTd, BpTh } from "./ui";

export type BrandRow = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  featured: boolean;
  sortOrder: number;
  logo: { url: string; alt: string | null } | null;
  _count: { products: number };
};

function move<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || to >= list.length) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

function BrandThumb({ brand }: { brand: BrandRow }) {
  return <span className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden border border-[var(--bp-divider)] bg-white">{brand.logo ? <Image src={brand.logo.url} alt={brand.logo.alt ?? brand.name} fill sizes="36px" className="object-contain p-1" /> : <Tag size={15} className="text-[var(--bp-muted)]" />}</span>;
}

export function BlueprintBrandsView({ brands }: { brands: BrandRow[] }) {
  const router = useRouter();
  const [items, setItems] = useState(brands);
  // The server list is the source of truth once a mutation settles and `router.refresh()` brings
  // a fresh copy; this render-time sync (not an effect) picks it up without an extra render pass.
  const [prevBrands, setPrevBrands] = useState(brands);
  if (brands !== prevBrands) {
    setPrevBrands(brands);
    setItems(brands);
  }
  const [savingOrder, setSavingOrder] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BrandRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  /** Renumbers `next` sequentially and pushes only the rows whose position actually moved. */
  async function persistOrder(next: BrandRow[], previous: BrandRow[]) {
    const numbered = next.map((item, position) => ({ ...item, sortOrder: position }));
    const changed = numbered.filter((item, position) => previous.find((entry) => entry.id === item.id)?.sortOrder !== position);
    setItems(numbered);
    if (!changed.length) return;
    setSavingOrder(true);
    try {
      await Promise.all(changed.map((item) => requestJson(`/api/brands/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: item.sortOrder }),
      }, { fallbackMessage: "ذخیره ترتیب برندها انجام نشد." })));
      router.refresh();
    } catch (reason) {
      setItems(previous);
      toast.danger("ذخیره ترتیب برندها انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد.") });
    } finally {
      setSavingOrder(false);
    }
  }

  // Rows reorder live as the pointer passes over them; `dragOrigin` keeps the list from before
  // the gesture started, so `endDrag` only has to diff the two snapshots once, on release.
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const dragOrigin = useRef<BrandRow[] | null>(null);

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
      return move(current, from, after ? overIndex : Math.max(0, overIndex));
    });
  }

  function endDrag() {
    const origin = dragOrigin.current;
    setDraggedId(null);
    dragOrigin.current = null;
    if (origin) void persistOrder(items, origin);
  }

  async function confirmDelete() {
    if (!deleteTarget || deleteLoading) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      await requestJson(`/api/brands/${deleteTarget.id}`, { method: "DELETE" }, { fallbackMessage: "حذف برند ناموفق بود." });
      toast.success("برند حذف شد", { description: `برند «${deleteTarget.name}» با موفقیت حذف شد.`, timeout: 4000 });
      setDeleteTarget(null);
      router.refresh();
    } catch (reason) {
      setDeleteError(requestErrorMessage(reason, "حذف برند ناموفق بود."));
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <AdminPageHeader flush title="برندها" description="برندهای قابل انتخاب برای محصولات و «محبوب‌ترین برندها»ی صفحه اصلی را مدیریت کنید." action={<Link href="/admin/brands/new" className="bp-btn bp-btn-primary gap-1.5"><Plus size={15} />برند جدید</Link>} />

      <section className="bp-frame p-[18px]">
        {items.length ? (
          <>
            <div className="md:hidden">
              {items.map((brand) => (
                <article
                  key={brand.id}
                  draggable={!savingOrder}
                  onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; beginDrag(brand.id); }}
                  onDragOver={(event) => dragOver(event, brand.id)}
                  onDrop={(event) => event.preventDefault()}
                  onDragEnd={endDrag}
                  className={`flex flex-col gap-3 border-b border-[var(--bp-row-line)] p-4 last:border-b-0 ${draggedId === brand.id ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <span aria-hidden="true" title="برای جابه‌جایی بکشید" className="bp-muted shrink-0 cursor-grab active:cursor-grabbing"><GripVertical size={15} /></span>
                    <BrandThumb brand={brand} />
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-sm">{brand.name}</strong>
                      <span dir="ltr" className="bp-muted block text-right font-mono text-xs">{brand.slug}</span>
                    </div>
                    <AdminStatusBadge tone={brand.isActive ? "success" : "neutral"}>{brand.isActive ? "فعال" : "غیرفعال"}</AdminStatusBadge>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="bp-muted text-[11px]">{brand._count.products.toLocaleString("fa-IR")} محصول</span>
                    <div className="flex items-center gap-1">
                      <Link href={`/admin/brands/${brand.id}/edit`} aria-label={`ویرایش ${brand.name}`} className="bp-btn bp-btn-secondary bp-btn-icon bp-btn-sm"><Pencil size={14} /></Link>
                      <BpButton isIconOnly size="sm" variant="ghost" className="text-[var(--bp-danger)]" aria-label={`حذف ${brand.name}`} disabled={brand._count.products > 0} onClick={() => { setDeleteError(""); setDeleteTarget(brand); }}><Trash2 size={14} /></BpButton>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <AdminBulkEditor entity="brands" entityLabel="برند" ids={items.map((brand) => brand.id)} actions={[{ value: "featured:on", label: "نمایش در صفحه اصلی" }, { value: "featured:off", label: "حذف از صفحه اصلی" }, { value: "active:on", label: "فعال‌کردن برندها" }, { value: "active:off", label: "غیرفعال‌کردن برندها" }]}>
              <BpTable ariaLabel="فهرست برندها" minWidth={640}>
                <thead>
                  <tr>
                    <BpTh className="w-8 text-center"><span className="sr-only">جابه‌جایی</span></BpTh>
                    <BpTh className="w-10 text-center"><span className="sr-only">انتخاب</span></BpTh>
                    <BpTh className="w-10">لوگو</BpTh>
                    <BpTh>نام</BpTh>
                    <BpTh>نشانی</BpTh>
                    <BpTh>محصولات</BpTh>
                    <BpTh>صفحه اصلی</BpTh>
                    <BpTh>وضعیت</BpTh>
                    <BpTh className="text-center">عملیات</BpTh>
                  </tr>
                </thead>
                <tbody>
                  {items.map((brand) => (
                    <tr
                      key={brand.id}
                      draggable={!savingOrder}
                      onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; beginDrag(brand.id); }}
                      onDragOver={(event) => dragOver(event, brand.id)}
                      onDrop={(event) => event.preventDefault()}
                      onDragEnd={endDrag}
                      className={draggedId === brand.id ? "opacity-50" : undefined}
                    >
                      <BpTd className="w-8 text-center"><span aria-hidden="true" title="برای جابه‌جایی بکشید" className="bp-muted inline-flex cursor-grab active:cursor-grabbing"><GripVertical size={15} /></span></BpTd>
                      <BpTd className="w-10 text-center"><AdminBulkCheckbox id={brand.id} label={`انتخاب برند ${brand.name}`} /></BpTd>
                      <BpTd><BrandThumb brand={brand} /></BpTd>
                      <BpTd className="max-w-[180px] truncate font-bold" title={brand.name}>{brand.name}</BpTd>
                      <BpTd className="bp-muted font-mono"><span dir="ltr">{brand.slug}</span></BpTd>
                      <BpTd className="text-[var(--bp-text)]">{brand._count.products.toLocaleString("fa-IR")}</BpTd>
                      <BpTd>{brand.featured ? <AdminStatusBadge tone="info">نمایش داده می‌شود</AdminStatusBadge> : <span className="bp-muted">—</span>}</BpTd>
                      <BpTd><AdminStatusBadge tone={brand.isActive ? "success" : "neutral"}>{brand.isActive ? "فعال" : "غیرفعال"}</AdminStatusBadge></BpTd>
                      <BpTd>
                        <div className="flex items-center justify-center gap-1">
                          <Link href={`/admin/brands/${brand.id}/edit`} aria-label={`ویرایش ${brand.name}`} title="ویرایش برند" className="bp-btn bp-btn-secondary bp-btn-icon bp-btn-sm"><Pencil size={14} /></Link>
                          <BpButton isIconOnly size="sm" variant="ghost" title={brand._count.products > 0 ? "برند دارای محصول قابل حذف نیست" : "حذف برند"} className="text-[var(--bp-danger)]" aria-label={`حذف ${brand.name}`} disabled={brand._count.products > 0} onClick={() => { setDeleteError(""); setDeleteTarget(brand); }}><Trash2 size={14} /></BpButton>
                        </div>
                      </BpTd>
                    </tr>
                  ))}
                </tbody>
              </BpTable>
            </AdminBulkEditor>
          </>
        ) : <AdminEmptyState title="برندی ثبت نشده" description="اولین برند فروشگاه را با دکمه «برند جدید» ثبت کنید." />}
      </section>

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        itemName={deleteTarget?.name}
        description="با حذف این برند، دیگر برای انتخاب روی محصولات در دسترس نخواهد بود."
        error={deleteError}
        loading={deleteLoading}
        onClose={() => { if (!deleteLoading) setDeleteTarget(null); }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
