import Image from "next/image";
import Link from "next/link";
import { BadgePercent, ListTree, Pencil, Plus, Settings2, Star } from "lucide-react";
import { Card, Table, TableBody, TableCell, TableColumn, TableContent, TableHeader, TableRow, TableScrollContainer } from "@/components/hero";
import type { Prisma, ProductStatus } from "@generated/prisma/client";
import { db } from "@/lib/db";
import { AdminEmptyState, AdminPageHeader, AdminPanel, AdminPrimaryLink, AdminStatusBadge } from "@/components/admin-ui";
import { productStatusLabels, productStatusTones } from "@/modules/admin/labels";
import { AdminListFilters } from "@/components/admin-list-filters";
import { AdminPagination } from "@/components/admin-pagination";
import { parseAdminPagination, resolveAdminPagination } from "@/lib/admin-pagination";
import { requirePermission } from "@/modules/auth/session";
import { AdminBulkCheckbox, AdminBulkEditor } from "@/components/admin-bulk-editor";
import { formatMoney } from "@/lib/format";
import { isProductDiscountActive } from "@/modules/products/discount";
import { getCatalogSettings } from "@/modules/settings/catalog-settings";

type Context = { searchParams: Promise<{ q?: string; status?: string; category?: string; featured?: string; page?: string; pageSize?: string }> };
type ProductRow = Prisma.ProductGetPayload<{ include: { category: true; media: { include: { media: true } }; _count: { select: { options: true } } } }>;

export default async function AdminProducts({ searchParams }: Context) {
  await requirePermission("catalog:manage");
  const catalogSettings = await getCatalogSettings();
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const status = (["DRAFT", "ACTIVE", "ARCHIVED"] as const).includes(params.status as ProductStatus) ? params.status as ProductStatus : undefined;
  const featured = params.featured === "yes" || params.featured === "no" ? params.featured : undefined;
  const { requestedPage, pageSize } = parseAdminPagination(params);
  const where: Prisma.ProductWhereInput = {
    ...(query ? { OR: [{ name: { contains: query } }, { sku: { contains: query } }, { slug: { contains: query } }] } : {}),
    ...(status ? { status } : {}),
    ...(params.category ? { categoryId: params.category } : {}),
    ...(featured ? { featured: featured === "yes" } : {}),
  };
  const filteredTotal = await db.product.count({ where });
  const pagination = resolveAdminPagination(filteredTotal, requestedPage, pageSize);
  const [products, categories, total, active, drafts] = await Promise.all([
    db.product.findMany({ where, skip: pagination.skip, take: pagination.pageSize, orderBy: { updatedAt: "desc" }, include: { category: true, media: { where: { isCover: true }, include: { media: true }, take: 1 }, _count: { select: { options: true } } } }),
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    db.product.count(),
    db.product.count({ where: { status: "ACTIVE" } }),
    db.product.count({ where: { status: "DRAFT" } }),
  ]);

  return (
    <>
      <AdminPageHeader eyebrow="مدیریت کاتالوگ" title="محصولات" description="محصولات، موجودی، قیمت‌گذاری و وضعیت انتشار را از یک‌جا مدیریت کنید." action={<AdminPrimaryLink href="/admin/products/new"><Plus size={17} />محصول جدید</AdminPrimaryLink>} />

      <div className="mb-5 grid grid-cols-3 gap-3">
        {[{ label: "همه محصولات", value: total }, { label: "منتشرشده", value: active }, { label: "پیش‌نویس", value: drafts }].map((item) => <Card key={item.label} variant="secondary" className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4"><strong className="block text-xl font-black text-[#172b4d]">{item.value.toLocaleString("fa-IR")}</strong><span className="text-[11px] text-slate-500 sm:text-xs">{item.label}</span></Card>)}
      </div>

      <AdminPanel>
        <div className="border-b border-slate-100 bg-slate-50/70 p-4"><AdminListFilters path="/admin/products" query={query} queryLabel="جست‌وجوی محصول" queryPlaceholder="نام، کد کالا یا نشانی محصول" filters={[{ name: "status", label: "وضعیت محصول", value: status ?? "", options: [{ value: "", label: "همه وضعیت‌ها" }, ...Object.entries(productStatusLabels).map(([value, label]) => ({ value, label }))] }, { name: "category", label: "دسته‌بندی", value: params.category ?? "", options: [{ value: "", label: "همه دسته‌ها" }, ...categories.map((category) => ({ value: category.id, label: category.name }))] }, { name: "featured", label: "نمایش ویژه", value: featured ?? "", options: [{ value: "", label: "همه محصولات" }, { value: "yes", label: "محصولات ویژه" }, { value: "no", label: "محصولات عادی" }] }]} /></div>

        {products.length ? <>
          <div className="grid gap-3 p-3 md:hidden">{products.map((product: ProductRow) => <ProductMobileCard key={product.id} product={product} />)}</div>
          <AdminBulkEditor entity="products" entityLabel="محصول" ids={products.map((product) => product.id)} actions={[{ value: "featured:on", label: "افزودن به محصولات ویژه" }, { value: "featured:off", label: "حذف از محصولات ویژه" }, { value: "status:ACTIVE", label: "انتشار محصولات" }, { value: "status:DRAFT", label: "انتقال به پیش‌نویس" }, { value: "status:ARCHIVED", label: "بایگانی محصولات" }, { value: "category:none", label: "حذف دسته‌بندی محصولات" }, ...categories.map((category) => ({ value: `category:${category.id}`, label: `انتقال به دسته: ${category.name}` }))]}><Table><TableScrollContainer><TableContent aria-label="فهرست محصولات" className="w-full min-w-[900px]"><TableHeader><TableColumn id="select" className="w-12 bg-white px-4 py-4 text-center"><span className="sr-only">انتخاب</span></TableColumn>{["ردیف", "محصول", "کد کالا", "قیمت‌گذاری", "موجودی", "وضعیت", "عملیات"].map((head, index) => <TableColumn id={head} key={head} isRowHeader={index === 1} className="bg-white px-5 py-4 text-right text-xs font-bold text-slate-500">{head}</TableColumn>)}</TableHeader><TableBody>{products.map((product: ProductRow, index) => <ProductTableRow key={product.id} product={product} rowNumber={pagination.skip + index + 1} lowStockThreshold={catalogSettings.catalogLowStockThreshold} />)}</TableBody></TableContent></TableScrollContainer></Table></AdminBulkEditor>
          <AdminPagination {...pagination} />
        </> : <AdminEmptyState title="محصولی پیدا نشد" description="فیلترها را تغییر دهید یا اولین محصول را ثبت کنید." />}
      </AdminPanel>
    </>
  );
}

function ProductThumb({ product }: { product: ProductRow }) {
  const cover = product.media[0]?.media;
  return <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#f3efe7]">{cover?.type === "IMAGE" ? <Image src={cover.url} alt={cover.alt ?? product.name} fill sizes="56px" className="object-cover" /> : <span className="grid h-full place-items-center text-lg text-[#b5904c]">زر</span>}</div>;
}

function ProductMobileCard({ product }: { product: ProductRow }) {
  return <Card variant="secondary" className="rounded-2xl border border-slate-100 p-4"><div className="flex gap-3"><ProductThumb product={product} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><strong className="block truncate text-sm text-slate-800">{product.name}</strong><span className="text-xs text-slate-400">{product.category?.name ?? "بدون دسته‌بندی"}</span></div>{product.featured && <Star size={16} className="shrink-0 fill-[#b5904c] text-[#b5904c]" />}</div><div className="mt-3 flex flex-wrap items-center gap-2"><AdminStatusBadge tone={productStatusTones[product.status]}>{productStatusLabels[product.status]}</AdminStatusBadge><span className="text-xs text-slate-500">موجودی: {product.stock.toLocaleString("fa-IR")}</span>{isProductDiscountActive(product) && <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-600"><BadgePercent size={13} />تخفیف فعال</span>}{product._count.options > 0 && <span className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2 py-1 text-[11px] font-bold text-violet-700"><ListTree size={13} />دارای {product._count.options.toLocaleString("fa-IR")} تنوع</span>}</div></div></div><div className="mt-4 grid grid-cols-2 gap-2"><Link href={`/admin/products/${product.id}/edit`} className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-100 text-xs font-bold text-[#172b4d]"><Pencil size={15} />ویرایش محصول</Link><Link href={`/admin/products/${product.id}/options`} className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-violet-50 text-xs font-bold text-violet-700"><Settings2 size={15} />مدیریت تنوع</Link></div></Card>;
}

function ProductTableRow({ product, rowNumber, lowStockThreshold }: { product: ProductRow; rowNumber: number; lowStockThreshold: number }) {
  const cell = "px-5 py-4 text-sm";
  return <TableRow id={product.id} className="transition hover:bg-slate-50/70"><TableCell className={`${cell} w-12 text-center`}><AdminBulkCheckbox id={product.id} label={`انتخاب محصول ${product.name}`} /></TableCell><TableCell className={`${cell} w-16 font-bold text-slate-400`}>{rowNumber.toLocaleString("fa-IR")}</TableCell><TableCell className={cell}><div className="flex items-center gap-3"><ProductThumb product={product} /><div className="min-w-0"><div className="flex items-center gap-2"><strong className="truncate text-slate-800">{product.name}</strong>{product.featured && <Star size={14} className="fill-[#b5904c] text-[#b5904c]" />}{isProductDiscountActive(product) && <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-600"><BadgePercent size={13} />تخفیف فعال</span>}{product._count.options > 0 && <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700" title={`${product._count.options.toLocaleString("fa-IR")} گروه تنوع`}><ListTree size={13} />دارای تنوع</span>}</div><span className="text-xs text-slate-400">{product.category?.name ?? "بدون دسته‌بندی"}</span></div></div></TableCell><TableCell className={`${cell} text-right font-mono text-xs text-slate-500`}>{product.sku}</TableCell><TableCell className={`${cell} text-slate-600`}>{product.storeIndustry === "GOLD" ? `${Number(product.weightGrams).toLocaleString("fa-IR", { maximumFractionDigits: 3 })} گرم` : product.fixedPrice ? formatMoney(product.fixedPrice.toString()) : "بدون قیمت"}</TableCell><TableCell className={cell}><span className={product.stock <= lowStockThreshold ? "font-bold text-rose-600" : "text-slate-600"}>{product.stock.toLocaleString("fa-IR")}</span></TableCell><TableCell className={cell}><AdminStatusBadge tone={productStatusTones[product.status]}>{productStatusLabels[product.status]}</AdminStatusBadge></TableCell><TableCell className={cell}><div className="flex items-center gap-1"><Link href={`/admin/products/${product.id}/options`} aria-label={`مدیریت تنوع محصول ${product.name}`} title="مدیریت تنوع" className="inline-flex h-9 min-h-9 w-9 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700 transition hover:border-violet-400"><Settings2 size={15} /></Link><Link href={`/admin/products/${product.id}/edit`} aria-label={`ویرایش محصول ${product.name}`} title="ویرایش محصول" className="inline-flex h-9 min-h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-[#172b4d] transition hover:border-[#b5904c] hover:text-[#846325]"><Pencil size={15} /></Link></div></TableCell></TableRow>;
}
