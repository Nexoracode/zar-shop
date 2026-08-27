import Image from "next/image";
import Link from "next/link";
import { BadgePercent, ListTree, Pencil, Plus, Star } from "lucide-react";
import { Card, Table, TableBody, TableCell, TableColumn, TableContent, TableHeader, TableRow, TableScrollContainer, TruncatedTextTooltip } from "@/components/hero";
import { AdminEmptyState, AdminPageHeader, AdminPanel, AdminPrimaryLink, AdminStatusBadge } from "@/components/admin-ui";
import { productStatusLabels, productStatusTones } from "@/modules/admin/labels";
import { AdminListFilters } from "@/components/admin-list-filters";
import { AdminPagination } from "@/components/admin-pagination";
import { AdminBulkCheckbox, AdminBulkEditor } from "@/components/admin-bulk-editor";
import { formatDateTime, formatMoney } from "@/lib/format";
import { isProductDiscountActive } from "@/modules/products/discount";
import { DiscountExpiryRefresh } from "@/components/discount-expiry-refresh";
import type { AdminProductsListData, ProductRow } from "@/components/admin/products-list-data";
import { ProductDeleteButton } from "@/components/product-delete-button";
import { ProductBulkEditButton } from "@/components/product-bulk-edit-modal";

function discountTooltip(product: ProductRow) {
  if (!product.discountStartsAt || !product.discountEndsAt) return "تخفیف فعال";
  return `تخفیف فعال
از ${formatDateTime(product.discountStartsAt)}
تا ${formatDateTime(product.discountEndsAt)}`;
}

/** One line per type, its own values after a colon — the same multi-line `title` shape as `discountTooltip`. */
function variantTooltip(product: ProductRow) {
  if (!product.optionTypes.length) return `${product._count.variants.toLocaleString("fa-IR")} ترکیب تنوع`;
  return product.optionTypes
    .map((optionType) => `${optionType.type.name}: ${optionType.values.map((item) => item.value.label).join("، ")}`)
    .join("\n");
}

export function ClassicProductsView({ products, categories, counts, filters, pagination, lowStockThreshold, nextDiscountBoundaryAt }: AdminProductsListData) {
  return (
    <>
      {/* Redraws the rows the moment any discount opens or closes, so the flags cannot go stale. */}
      <DiscountExpiryRefresh at={nextDiscountBoundaryAt} />
      <AdminPageHeader eyebrow="مدیریت کاتالوگ" title="محصولات" description="محصولات، موجودی، قیمت‌گذاری و وضعیت انتشار را از یک‌جا مدیریت کنید." action={<AdminPrimaryLink href="/admin/products/new"><Plus size={17} />محصول جدید</AdminPrimaryLink>} />

      <div className="mb-5 grid grid-cols-3 gap-3">
        {[{ label: "همه محصولات", value: counts.total }, { label: "منتشرشده", value: counts.active }, { label: "پیش‌نویس", value: counts.drafts }].map((item) => <Card key={item.label} variant="secondary" className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4"><strong className="block text-xl font-bold text-[var(--accent)]">{item.value.toLocaleString("fa-IR")}</strong><span className="text-[11px] text-slate-500 sm:text-xs">{item.label}</span></Card>)}
      </div>

      <AdminPanel>
        <div className="border-b border-slate-100 bg-slate-50/70 p-4"><AdminListFilters path="/admin/products" query={filters.query} queryLabel="جستجوی محصول" queryPlaceholder="نام، کد کالا یا نشانی محصول" filters={[{ name: "status", label: "وضعیت محصول", value: filters.status, options: [{ value: "", label: "همه وضعیت‌ها" }, ...Object.entries(productStatusLabels).map(([value, label]) => ({ value, label }))] }, { name: "category", label: "دسته‌بندی", value: filters.category, options: [{ value: "", label: "همه دسته‌ها" }, ...categories.map((category) => ({ value: category.id, label: category.name }))] }, { name: "featured", label: "نمایش ویژه", value: filters.featured, options: [{ value: "", label: "همه محصولات" }, { value: "yes", label: "محصولات ویژه" }, { value: "no", label: "محصولات عادی" }] }, { name: "stock", label: "وضعیت موجودی", value: filters.stock, options: [{ value: "", label: "همه موجودی‌ها" }, { value: "in", label: "موجود" }, { value: "low", label: "کم‌موجود" }, { value: "out", label: "ناموجود" }] }, { name: "discount", label: "وضعیت تخفیف", value: filters.discount, options: [{ value: "", label: "همه تخفیف‌ها" }, { value: "active", label: "دارای تخفیف فعال" }, { value: "upcoming", label: "تخفیف آینده" }, { value: "none", label: "بدون تخفیف" }] }]} /></div>

        {products.length ? <>
          <div className="grid gap-3 p-3 md:hidden">{products.map((product: ProductRow) => <ProductMobileCard key={product.id} product={product} />)}</div>
          <AdminBulkEditor entity="products" entityLabel="محصول" ids={products.map((product) => product.id)} actions={[{ value: "featured:on", label: "افزودن به محصولات ویژه" }, { value: "featured:off", label: "حذف از محصولات ویژه" }, { value: "status:ACTIVE", label: "انتشار محصولات" }, { value: "status:DRAFT", label: "انتقال به پیش‌نویس" }, { value: "status:ARCHIVED", label: "بایگانی محصولات" }, { value: "category:none", label: "حذف دسته‌بندی محصولات" }, ...categories.map((category) => ({ value: `category:${category.id}`, label: `انتقال به دسته: ${category.name}` }))]} extraAction={<ProductBulkEditButton products={products.map((product) => ({ id: product.id, variantTypeNames: product.optionTypes.map((optionType) => optionType.type.name) }))} />}><Table><TableScrollContainer><TableContent aria-label="فهرست محصولات" className="w-full min-w-[900px]"><TableHeader><TableColumn id="select" className="w-12 bg-white px-4 py-4 text-center"><span className="sr-only">انتخاب</span></TableColumn>{["ردیف", "محصول", "کد کالا", "قیمت‌گذاری", "موجودی", "وضعیت", "عملیات"].map((head, index) => <TableColumn id={head} key={head} isRowHeader={index === 1} className="bg-white px-5 py-4 text-right text-xs font-bold text-slate-500">{head}</TableColumn>)}</TableHeader><TableBody>{products.map((product: ProductRow, index) => <ProductTableRow key={product.id} product={product} rowNumber={pagination.skip + index + 1} lowStockThreshold={lowStockThreshold} />)}</TableBody></TableContent></TableScrollContainer></Table></AdminBulkEditor>
          <AdminPagination page={pagination.page} pageSize={pagination.pageSize} totalItems={pagination.totalItems} totalPages={pagination.totalPages} />
        </> : <AdminEmptyState title="محصولی پیدا نشد" description="فیلترها را تغییر دهید یا اولین محصول را ثبت کنید." />}
      </AdminPanel>
    </>
  );
}

function ProductThumb({ product }: { product: ProductRow }) {
  const cover = product.media[0]?.media;
  return <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[var(--warning)]/10">{cover?.type === "IMAGE" ? <Image src={cover.url} alt={cover.alt ?? product.name} fill sizes="56px" className="object-cover" /> : <span className="grid h-full place-items-center text-lg text-[var(--warning)]">زر</span>}</div>;
}

function ProductMobileCard({ product }: { product: ProductRow }) {
  return <Card variant="secondary" className="rounded-2xl border border-slate-100 p-4"><div className="flex gap-3"><ProductThumb product={product} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><strong className="block truncate text-sm text-slate-800">{product.name}</strong><span className="text-xs text-slate-400">{product.category?.name ?? "بدون دسته‌بندی"}</span></div>{product.featured && <Star size={16} className="shrink-0 fill-[var(--warning)] text-[var(--warning)]" />}</div><div className="mt-3 flex flex-wrap items-center gap-2"><AdminStatusBadge tone={productStatusTones[product.status]}>{productStatusLabels[product.status]}</AdminStatusBadge><span className="text-xs text-slate-500">موجودی: {product.stock.toLocaleString("fa-IR")}</span>{isProductDiscountActive(product) && <span title={discountTooltip(product)} className="inline-flex cursor-help items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-600"><BadgePercent size={13} />تخفیف فعال</span>}{product._count.variants > 0 && <span title={variantTooltip(product)} className="inline-flex cursor-help items-center gap-1 rounded-lg bg-violet-50 px-2 py-1 text-[11px] font-bold text-violet-700"><ListTree size={13} />دارای {product._count.variants.toLocaleString("fa-IR")} تنوع</span>}</div></div></div><div className="mt-4 grid grid-cols-2 gap-2"><Link href={`/admin/products/${product.id}/edit`} className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-100 text-xs font-bold text-[var(--accent)]"><Pencil size={15} />ویرایش محصول</Link><ProductDeleteButton id={product.id} name={product.name} disabled={product._count.orderItems > 0} /></div></Card>;
}

function ProductTableRow({ product, rowNumber, lowStockThreshold }: { product: ProductRow; rowNumber: number; lowStockThreshold: number }) {
  const cell = "px-5 py-4 text-sm";
  return <TableRow id={product.id} className="transition hover:bg-slate-50/70"><TableCell className={`${cell} w-12 text-center`}><AdminBulkCheckbox id={product.id} label={`انتخاب محصول ${product.name}`} /></TableCell><TableCell className={`${cell} w-16 font-bold text-slate-400`}>{rowNumber.toLocaleString("fa-IR")}</TableCell><TableCell className={`${cell} w-[340px] max-w-[340px]`}><div className="flex min-w-0 items-center gap-3"><ProductThumb product={product} /><div className="min-w-0 flex-1"><div className="flex min-w-0 items-center gap-2"><TruncatedTextTooltip text={product.name} className="max-w-[180px] font-bold text-slate-800" />{product.featured && <Star size={14} className="shrink-0 fill-[var(--warning)] text-[var(--warning)]" />}{isProductDiscountActive(product) && <span title={discountTooltip(product)} className="inline-flex shrink-0 cursor-help items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-600"><BadgePercent size={13} />تخفیف فعال</span>}{product._count.variants > 0 && <span className="inline-flex shrink-0 cursor-help items-center gap-1 rounded-lg bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700" title={variantTooltip(product)}><ListTree size={13} />دارای تنوع</span>}</div><TruncatedTextTooltip text={product.category?.name ?? "بدون دسته‌بندی"} className="max-w-[220px] text-xs text-slate-400" /></div></div></TableCell><TableCell className={`${cell} text-right font-mono text-xs text-slate-500`}>{product.sku}</TableCell><TableCell className={`${cell} text-slate-600`}>{product.storeIndustry === "GOLD" ? `${Number(product.weightGrams).toLocaleString("fa-IR", { maximumFractionDigits: 3 })} گرم` : product.fixedPrice ? formatMoney(product.fixedPrice.toString()) : "بدون قیمت"}</TableCell><TableCell className={cell}><span className={product.stock <= lowStockThreshold ? "font-bold text-rose-600" : "text-slate-600"}>{product.stock.toLocaleString("fa-IR")}</span></TableCell><TableCell className={cell}><AdminStatusBadge tone={productStatusTones[product.status]}>{productStatusLabels[product.status]}</AdminStatusBadge></TableCell><TableCell className={cell}><div className="flex items-center gap-1"><Link href={`/admin/products/${product.id}/edit`} aria-label={`ویرایش محصول ${product.name}`} title="ویرایش محصول" className="inline-flex h-9 min-h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-[var(--accent)] transition hover:border-[var(--warning)] hover:text-[var(--warning)]"><Pencil size={15} /></Link><ProductDeleteButton id={product.id} name={product.name} disabled={product._count.orderItems > 0} iconOnly /></div></TableCell></TableRow>;
}
