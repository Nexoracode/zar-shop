import Link from "next/link";
import { Card } from "@/components/hero";
import { ArrowLeft, CheckCircle2, ListChecks } from "lucide-react";
import { AdminEmptyState, AdminPageHeader, AdminPanel } from "@/components/admin-ui";
import { AdminListFilters } from "@/components/admin-list-filters";
import { AdminPagination } from "@/components/admin-pagination";
import { db } from "@/lib/db";
import { resolveAdminPagination } from "@/lib/admin-pagination";
import { parseAdminPaginationRequest } from "@/lib/admin-pagination-server";
import { requirePermission } from "@/modules/auth/session";
import { parseCategoryAttributeSchema, parseProductAttributes } from "@/modules/products/attributes";

type Context = { searchParams: Promise<{ q?: string; page?: string; pageSize?: string }> };

export default async function ProductAttributesIndexPage({ searchParams }: Context) {
  await requirePermission("catalog:manage");
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const where = query ? { OR: [{ name: { contains: query } }, { sku: { contains: query } }, { slug: { contains: query } }] } : {};
  const totalItems = await db.product.count({ where });
  const { requestedPage, pageSize } = await parseAdminPaginationRequest(params);
  const pagination = resolveAdminPagination(totalItems, requestedPage, pageSize);
  const products = await db.product.findMany({
    where,
    select: { id: true, name: true, sku: true, attributes: true, category: { select: { name: true, attributeSchema: true } } },
    orderBy: { updatedAt: "desc" },
    skip: pagination.skip,
    take: pagination.pageSize,
  });

  const rows = products.map((product) => {
    const definitions = parseCategoryAttributeSchema(product.category?.attributeSchema).flatMap((group) => group.attributes);
    const completedIds = new Set(parseProductAttributes(product.attributes).filter((item) => item.values.length).map((item) => item.attributeId));
    return { ...product, total: definitions.length, completed: definitions.filter((item) => completedIds.has(item.id)).length };
  });

  return <>
    <AdminPageHeader eyebrow="مدیریت کاتالوگ" title="ویژگی‌های محصولات" description="محصول را پیدا کنید، میزان تکمیل مشخصات آن را ببینید و وارد صفحه اختصاصی مدیریت ویژگی‌ها شوید." />
    <AdminPanel>
      <div className="border-b border-slate-100 bg-slate-50/70 p-4"><AdminListFilters path="/admin/product-attributes" query={query} queryLabel="جستجوی محصول" queryPlaceholder="نام، کد کالا یا نشانی محصول" filters={[]} /></div>
      {rows.length ? <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">{rows.map((product) => {
        const complete = product.total > 0 && product.completed === product.total;
        return <Card key={product.id} variant="secondary" className="rounded-xl border border-slate-200 bg-white p-3 shadow-none"><div className="flex min-w-0 items-start gap-3"><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${complete ? "bg-emerald-50 text-emerald-600" : "bg-violet-50 text-violet-700"}`}>{complete ? <CheckCircle2 size={19} /> : <ListChecks size={19} />}</span><div className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-800">{product.name}</strong><span dir="ltr" className="mt-0.5 block truncate text-right font-mono text-[10px] text-slate-400">{product.sku}</span><span className="mt-2 block truncate text-[11px] text-slate-500">{product.category?.name ?? "بدون دسته‌بندی"}</span></div></div><div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3"><span className="text-[11px] font-bold text-slate-600">{product.completed.toLocaleString("fa-IR")} از {product.total.toLocaleString("fa-IR")} تکمیل</span><Link href={`/admin/products/${product.id}/attributes`} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-violet-700 px-3 text-[11px] font-bold text-white">مدیریت <ArrowLeft size={13} /></Link></div></Card>;
      })}</div> : <AdminEmptyState title="محصولی پیدا نشد" description="عبارت جستجو را تغییر دهید یا ابتدا یک محصول بسازید." />}
      {rows.length > 0 && <AdminPagination {...pagination} />}
    </AdminPanel>
  </>;
}
