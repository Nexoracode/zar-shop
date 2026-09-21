"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { BadgePercent, Gift, ShoppingBag, SquarePen, ToggleLeft, ToggleRight, Trash2, Truck } from "lucide-react";
import { AdminEmptyState, AdminPageHeader, AdminPrimaryLink, AdminStatusBadge } from "@/components/admin-ui";
import { AdminListFilters } from "@/components/admin-list-filters";
import { AdminPagination } from "@/components/admin-pagination";
import { AdminClearFilters } from "@/components/admin-clear-filters";
import { AdminBulkCheckbox, AdminBulkEditor, AdminBulkTr } from "@/components/admin-bulk-editor";
import { AdminColumn, AdminColumnSettingsButton, AdminColumnVisibility } from "@/components/admin-column-visibility";
import { AdminColumnFilter } from "@/components/admin-column-filter";
import { AdminGenericBulkEditButton } from "@/components/admin-generic-bulk-edit";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import type { PromotionItem } from "@/modules/promotions/admin";
import { BpButton, BpTable, BpTag, BpTd, BpTh, formatPersianDateTime } from "./ui";

function scopeLabel(item: PromotionItem): string | null {
  const parts: string[] = [];
  if (item.itemScope === "PRODUCTS") parts.push(`${item.targetProductIds.length.toLocaleString("fa-IR")} محصول`);
  if (item.itemScope === "CATEGORIES") parts.push(`${item.targetCategoryIds.length.toLocaleString("fa-IR")} دسته`);
  if (item.audienceScope === "SPECIFIC_USERS") parts.push("کاربران خاص");
  return parts.length ? parts.join(" · ") : null;
}

const typeMeta: Record<PromotionItem["type"], { label: string; icon: React.ReactNode }> = {
  COUPON: { label: "کد تخفیف", icon: <BadgePercent size={15} /> },
  FREE_SHIPPING: { label: "ارسال رایگان", icon: <Truck size={15} /> },
  NEXT_PURCHASE: { label: "تخفیف خرید بعدی", icon: <Gift size={15} /> },
  FIRST_PURCHASE: { label: "خرید اول", icon: <ShoppingBag size={15} /> },
};

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`bp-frame relative ${className}`.trim()}>{children}</section>;
}

type Props = {
  initialItems: PromotionItem[];
  query: string;
  status?: "active" | "inactive";
  type?: PromotionItem["type"];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
  initialHiddenColumns: string[];
};

const PROMOTIONS_TABLE_ID = "promotions";

const promotionColumns = [
  { id: "titleAndType", label: "عنوان و نوع" },
  { id: "validity", label: "بازهٔ اعتبار" },
  { id: "usage", label: "مصرف" },
  { id: "status", label: "وضعیت" },
];

export function BlueprintPromotionsView({ initialItems, query, status, type, pagination, initialHiddenColumns }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [prev, setPrev] = useState(initialItems);
  if (initialItems !== prev) { setPrev(initialItems); setItems(initialItems); }

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<PromotionItem | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function toggle(item: PromotionItem) {
    setTogglingId(item.id);
    try {
      const data = await requestJson<PromotionItem>(`/api/admin/promotions/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, isActive: !item.isActive, usageCount: undefined, rewardCount: undefined, id: undefined }),
      }, { fallbackMessage: "تغییر وضعیت انجام نشد." });
      setItems((current) => current.map((candidate) => (candidate.id === item.id ? data : candidate)));
      toast.success(item.isActive ? "پروموشن غیرفعال شد." : "پروموشن فعال شد.");
    } catch (reason) {
      toast.danger("تغییر وضعیت انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد.") });
    } finally {
      setTogglingId(null);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await requestJson(`/api/admin/promotions/${deleting.id}`, { method: "DELETE" }, { fallbackMessage: "حذف پروموشن انجام نشد." });
      setItems((current) => current.filter((item) => item.id !== deleting.id));
      setDeleting(null);
      toast.success("پروموشن حذف شد.");
      router.refresh();
    } catch (reason) {
      setDeleteError(requestErrorMessage(reason, "حذف پروموشن انجام نشد."));
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <AdminPageHeader
        flush
        title="پروموشن‌ها"
        description="وضعیت، بازهٔ اعتبار و میزان استفاده از کمپین‌های فروش را مدیریت کنید."
        action={<AdminPrimaryLink href="/admin/promotions/new">پروموشن جدید</AdminPrimaryLink>}
      />

      <Panel>
        <div className="border-b border-[var(--bp-divider)] p-4">
          <AdminListFilters
            path="/admin/promotions"
            query={query}
            queryLabel="جستجوی پروموشن"
            queryPlaceholder="عنوان یا کد تخفیف"
            filters={[]}
            large
          />
        </div>

        {!items.length ? (
          <AdminEmptyState title="پروموشنی پیدا نشد" description={query || status || type ? "فیلترها را تغییر دهید و دوباره جستجو کنید." : "برای ساخت اولین کمپین از دکمهٔ «پروموشن جدید» استفاده کنید."} action={query || status || type ? <AdminClearFilters href="/admin/promotions" /> : undefined} />
        ) : (
          <>
            <div className="md:hidden">
              {items.map((item) => (
                <article key={item.id} className="flex flex-col gap-2.5 border-b border-[var(--bp-row-line)] p-4 last:border-b-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--bp-muted)]">{typeMeta[item.type].icon}</span>
                    <strong className="min-w-0 flex-1 truncate text-sm">{item.title}</strong>
                    <AdminStatusBadge tone={item.isActive ? "success" : "neutral"}>{item.isActive ? "فعال" : "غیرفعال"}</AdminStatusBadge>
                  </div>
                  <span className="bp-muted text-[11px]">{typeMeta[item.type].label}{item.code ? ` · ${item.code}` : ""}</span>
                  {scopeLabel(item) ? <BpTag tone="accent" className="self-start">{scopeLabel(item)}</BpTag> : null}
                  <span className="bp-muted text-[11px]">{formatPersianDateTime(item.startsAt)} تا {formatPersianDateTime(item.endsAt)}</span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="bp-muted text-[11px]">{item.usageCount.toLocaleString("fa-IR")} استفاده{item.rewardCount ? ` · ${item.rewardCount.toLocaleString("fa-IR")} پاداش` : ""}</span>
                    <div className="flex items-center gap-1">
                      <BpButton isIconOnly size="sm" variant="ghost" isPending={togglingId === item.id} aria-label={item.isActive ? `غیرفعال‌کردن ${item.title}` : `فعال‌کردن ${item.title}`} onClick={() => void toggle(item)}>{item.isActive ? <ToggleRight size={15} strokeWidth={1.5} className="text-[var(--bp-success)]" /> : <ToggleLeft size={15} strokeWidth={1.5} className="bp-muted" />}</BpButton>
                      <Link href={`/admin/promotions/${item.id}/edit`} aria-label={`ویرایش ${item.title}`} className="bp-btn bp-btn-ghost bp-btn-icon bp-btn-sm"><SquarePen size={15} strokeWidth={1.5} /></Link>
                      <BpButton isIconOnly size="sm" variant="ghost" className="bp-btn-danger-icon" aria-label={`حذف ${item.title}`} onClick={() => { setDeleteError(""); setDeleting(item); }}><Trash2 size={15} strokeWidth={1.5} /></BpButton>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <AdminColumnVisibility tableId={PROMOTIONS_TABLE_ID} columns={promotionColumns} initialHidden={initialHiddenColumns}>
              <AdminBulkEditor
                entity="promotions"
                entityLabel="پروموشن"
                ids={items.map((item) => item.id)}
                actions={[]}
                beforeSelectAll={<AdminColumnSettingsButton />}
                extraAction={<AdminGenericBulkEditButton entity="promotions" entityLabel="پروموشن" changeTypes={[{ value: "active", label: "وضعیت", options: [{ value: "active:on", label: "فعال‌کردن" }, { value: "active:off", label: "غیرفعال‌کردن" }] }]} />}
              >
                <BpTable ariaLabel="فهرست پروموشن‌ها" minWidth={880}>
                  <thead>
                    <tr>
                      <BpTh className="w-10 text-center"><span className="sr-only">انتخاب</span></BpTh>
                      <AdminColumn id="titleAndType"><BpTh><span className="inline-flex items-center">عنوان و نوع<AdminColumnFilter path="/admin/promotions" ariaLabel="فیلتر نوع پروموشن" groups={[{ name: "type", label: "نوع پروموشن", value: type ?? "", options: [{ value: "", label: "همه انواع" }, ...Object.entries(typeMeta).map(([value, meta]) => ({ value, label: meta.label }))] }]} /></span></BpTh></AdminColumn>
                      <AdminColumn id="validity"><BpTh>بازهٔ اعتبار</BpTh></AdminColumn>
                      <AdminColumn id="usage"><BpTh>مصرف</BpTh></AdminColumn>
                      <AdminColumn id="status"><BpTh><span className="inline-flex items-center">وضعیت<AdminColumnFilter path="/admin/promotions" ariaLabel="فیلتر وضعیت" groups={[{ name: "status", label: "وضعیت", value: status ?? "", options: [{ value: "", label: "همه وضعیت‌ها" }, { value: "active", label: "فعال" }, { value: "inactive", label: "غیرفعال" }] }]} /></span></BpTh></AdminColumn>
                      <BpTh>عملیات</BpTh>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <AdminBulkTr key={item.id} id={item.id}>
                        <BpTd className="w-10 text-center"><AdminBulkCheckbox id={item.id} label={`انتخاب پروموشن ${item.title}`} /></BpTd>
                        <AdminColumn id="titleAndType">
                          <BpTd className="max-w-[260px]">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="shrink-0 text-[var(--bp-muted)]">{typeMeta[item.type].icon}</span>
                              <div className="min-w-0">
                                <span className="block truncate font-bold" title={item.title}>{item.title}</span>
                                <span className="bp-muted block truncate text-[11px]">{typeMeta[item.type].label}{item.code ? <span dir="ltr" className="ms-1.5 font-mono">{item.code}</span> : null}</span>
                                {scopeLabel(item) ? <BpTag tone="accent" className="mt-1">{scopeLabel(item)}</BpTag> : null}
                              </div>
                            </div>
                          </BpTd>
                        </AdminColumn>
                        <AdminColumn id="validity"><BpTd className="bp-muted whitespace-nowrap text-[12px]">{formatPersianDateTime(item.startsAt)} تا {formatPersianDateTime(item.endsAt)}</BpTd></AdminColumn>
                        <AdminColumn id="usage">
                          <BpTd className="text-[12px]">
                            {item.usageCount.toLocaleString("fa-IR")} استفاده
                            {item.rewardCount ? <span className="bp-muted block text-[10px]">{item.rewardCount.toLocaleString("fa-IR")} پاداش صادرشده</span> : null}
                          </BpTd>
                        </AdminColumn>
                        <AdminColumn id="status"><BpTd><AdminStatusBadge tone={item.isActive ? "success" : "neutral"}>{item.isActive ? "فعال" : "غیرفعال"}</AdminStatusBadge></BpTd></AdminColumn>
                        <BpTd>
                          <div className="flex items-center justify-start gap-1">
                            <BpButton isIconOnly size="sm" variant="ghost" isPending={togglingId === item.id} title={item.isActive ? "غیرفعال‌کردن" : "فعال‌کردن"} aria-label={item.isActive ? `غیرفعال‌کردن ${item.title}` : `فعال‌کردن ${item.title}`} onClick={() => void toggle(item)}>{item.isActive ? <ToggleRight size={15} strokeWidth={1.5} className="text-[var(--bp-success)]" /> : <ToggleLeft size={15} strokeWidth={1.5} className="bp-muted" />}</BpButton>
                            <Link href={`/admin/promotions/${item.id}/edit`} aria-label={`ویرایش ${item.title}`} title="ویرایش" className="bp-btn bp-btn-ghost bp-btn-icon bp-btn-sm"><SquarePen size={15} strokeWidth={1.5} /></Link>
                            <BpButton isIconOnly size="sm" variant="ghost" className="bp-btn-danger-icon" title="حذف" aria-label={`حذف ${item.title}`} onClick={() => { setDeleteError(""); setDeleting(item); }}><Trash2 size={15} strokeWidth={1.5} /></BpButton>
                          </div>
                        </BpTd>
                      </AdminBulkTr>
                    ))}
                  </tbody>
                </BpTable>
              </AdminBulkEditor>
            </AdminColumnVisibility>
            <AdminPagination page={pagination.page} pageSize={pagination.pageSize} totalItems={pagination.totalItems} totalPages={pagination.totalPages} />
          </>
        )}
      </Panel>

      <DeleteConfirmDialog
        open={Boolean(deleting)}
        title="حذف پروموشن"
        itemName={deleting?.title}
        description="اگر این پروموشن سابقهٔ استفاده یا پاداش داشته باشد حذف نمی‌شود و باید آن را غیرفعال کنید."
        error={deleteError}
        loading={deleteBusy}
        onClose={() => { setDeleting(null); setDeleteError(""); }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
