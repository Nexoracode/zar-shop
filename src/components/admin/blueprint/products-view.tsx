import Image from "next/image";
import Link from "next/link";
import { BadgePercent, ListTree, Pencil, Plus, Settings2, Star } from "lucide-react";
import { AdminEmptyState, AdminPageHeader, AdminPrimaryLink, AdminStatusBadge } from "@/components/admin-ui";
import { productStatusLabels, productStatusTones } from "@/modules/admin/labels";
import { AdminListFilters } from "@/components/admin-list-filters";
import { AdminPagination } from "@/components/admin-pagination";
import { AdminBulkCheckbox, AdminBulkEditor } from "@/components/admin-bulk-editor";
import { formatMoney } from "@/lib/format";
import { isProductDiscountActive } from "@/modules/products/discount";
import type { AdminProductsListData, ProductRow } from "@/components/admin/products-list-data";
import { BpCorners, BpKicker } from "./ui/card";
import { BpTable, BpTd, BpTh } from "./ui/table";

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`bp-frame relative ${className}`}><BpCorners />{children}</section>;
}

/** Small hairline chip for the inline product flags (discount, variants). */
function Flag({ icon, children, title }: { icon: React.ReactNode; children: React.ReactNode; title?: string }) {
  return (
    <span title={title} className="inline-flex shrink-0 items-center gap-1 border border-[var(--bp-divider)] px-1.5 py-0.5 text-[10px] text-[var(--bp-muted)]">
      {icon}{children}
    </span>
  );
}

function ProductThumb({ product }: { product: ProductRow }) {
  const cover = product.media[0]?.media;
  return (
    <div className="relative h-12 w-12 shrink-0 overflow-hidden border border-[var(--bp-divider)] bg-[var(--bp-surface)]">
      {cover?.type === "IMAGE"
        ? <Image src={cover.url} alt={cover.alt ?? product.name} fill sizes="48px" className="object-cover" />
        : <span className="grid h-full place-items-center text-base text-[var(--bp-muted)]">زر</span>}
    </div>
  );
}

function priceLabel(product: ProductRow) {
  if (product.storeIndustry === "GOLD") return `${Number(product.weightGrams).toLocaleString("fa-IR", { maximumFractionDigits: 3 })} گرم`;
  return product.fixedPrice ? formatMoney(product.fixedPrice.toString()) : "بدون قیمت";
}

export function BlueprintProductsView({ products, categories, counts, filters, pagination, lowStockThreshold }: AdminProductsListData) {
  const bulkActions = [
    { value: "featured:on", label: "افزودن به محصولات ویژه" },
    { value: "featured:off", label: "حذف از محصولات ویژه" },
    { value: "status:ACTIVE", label: "انتشار محصولات" },
    { value: "status:DRAFT", label: "انتقال به پیش‌نویس" },
    { value: "status:ARCHIVED", label: "بایگانی محصولات" },
    { value: "category:none", label: "حذف دسته‌بندی محصولات" },
    ...categories.map((category) => ({ value: `category:${category.id}`, label: `انتقال به دسته: ${category.name}` })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="مدیریت کاتالوگ"
        title="محصولات"
        description="محصولات، موجودی، قیمت‌گذاری و وضعیت انتشار را از یک‌جا مدیریت کنید."
        action={<AdminPrimaryLink href="/admin/products/new"><Plus size={16} />محصول جدید</AdminPrimaryLink>}
      />

      <div className="grid grid-cols-3 gap-4">
        {[{ label: "همه محصولات", value: counts.total }, { label: "منتشرشده", value: counts.active }, { label: "پیش‌نویس", value: counts.drafts }].map((item) => (
          <Panel key={item.label} className="p-[18px]">
            <BpKicker>{item.label}</BpKicker>
            <strong className="mt-1 block text-[26px] font-bold tracking-[-0.02em]">{item.value.toLocaleString("fa-IR")}</strong>
          </Panel>
        ))}
      </div>

      <Panel className="p-4">
        <AdminListFilters
          path="/admin/products"
          query={filters.query}
          queryLabel="جستجوی محصول"
          queryPlaceholder="نام، کد کالا یا نشانی محصول"
          filters={[
            { name: "status", label: "وضعیت محصول", value: filters.status, options: [{ value: "", label: "همه وضعیت‌ها" }, ...Object.entries(productStatusLabels).map(([value, label]) => ({ value, label }))] },
            { name: "category", label: "دسته‌بندی", value: filters.category, options: [{ value: "", label: "همه دسته‌ها" }, ...categories.map((category) => ({ value: category.id, label: category.name }))] },
            { name: "featured", label: "نمایش ویژه", value: filters.featured, options: [{ value: "", label: "همه محصولات" }, { value: "yes", label: "محصولات ویژه" }, { value: "no", label: "محصولات عادی" }] },
          ]}
        />
      </Panel>

      <Panel>
        {products.length ? (
          <>
            <div className="md:hidden">
              {products.map((product) => (
                <article key={product.id} className="border-b border-[var(--bp-row-line)] p-4 last:border-b-0">
                  <div className="flex gap-3">
                    <ProductThumb product={product} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <strong className="block truncate text-[13px]">{product.name}</strong>
                          <span className="bp-muted text-[11px]">{product.category?.name ?? "بدون دسته‌بندی"}</span>
                        </div>
                        {product.featured && <Star size={15} className="shrink-0 fill-[var(--bp-accent)] text-[var(--bp-accent)]" />}
                      </div>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <AdminStatusBadge tone={productStatusTones[product.status]}>{productStatusLabels[product.status]}</AdminStatusBadge>
                        <span className="bp-muted text-[11px]">موجودی: {product.stock.toLocaleString("fa-IR")}</span>
                        {isProductDiscountActive(product) && <Flag icon={<BadgePercent size={12} />}>تخفیف فعال</Flag>}
                        {product._count.options > 0 && <Flag icon={<ListTree size={12} />}>{product._count.options.toLocaleString("fa-IR")} تنوع</Flag>}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Link href={`/admin/products/${product.id}/edit`} className="bp-btn bp-btn-secondary text-[13px]"><Pencil size={14} />ویرایش محصول</Link>
                    <Link href={`/admin/products/${product.id}/options`} className="bp-btn bp-btn-secondary text-[13px]"><Settings2 size={14} />مدیریت تنوع</Link>
                  </div>
                </article>
              ))}
            </div>

            <AdminBulkEditor entity="products" entityLabel="محصول" ids={products.map((product) => product.id)} actions={bulkActions}>
              <BpTable ariaLabel="فهرست محصولات" minWidth={900}>
                <thead>
                  <tr>
                    <BpTh className="w-12 text-center"><span className="sr-only">انتخاب</span></BpTh>
                    <BpTh className="w-14">ردیف</BpTh>
                    <BpTh>محصول</BpTh>
                    <BpTh>کد کالا</BpTh>
                    <BpTh>قیمت‌گذاری</BpTh>
                    <BpTh>موجودی</BpTh>
                    <BpTh>وضعیت</BpTh>
                    <BpTh>عملیات</BpTh>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product, index) => (
                    <tr key={product.id}>
                      <BpTd className="w-12 text-center"><AdminBulkCheckbox id={product.id} label={`انتخاب محصول ${product.name}`} /></BpTd>
                      <BpTd className="bp-muted w-14 text-[13px]">{(pagination.skip + index + 1).toLocaleString("fa-IR")}</BpTd>
                      <BpTd className="w-[340px] max-w-[340px]">
                        <div className="flex min-w-0 items-center gap-3">
                          <ProductThumb product={product} />
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="truncate text-[13px] font-bold" title={product.name}>{product.name}</span>
                              {product.featured && <Star size={13} className="shrink-0 fill-[var(--bp-accent)] text-[var(--bp-accent)]" />}
                              {isProductDiscountActive(product) && <Flag icon={<BadgePercent size={11} />}>تخفیف</Flag>}
                              {product._count.options > 0 && <Flag icon={<ListTree size={11} />} title={`${product._count.options.toLocaleString("fa-IR")} گروه تنوع`}>تنوع</Flag>}
                            </div>
                            <span className="bp-muted block truncate text-[11px]" title={product.category?.name ?? "بدون دسته‌بندی"}>{product.category?.name ?? "بدون دسته‌بندی"}</span>
                          </div>
                        </div>
                      </BpTd>
                      <BpTd className="bp-muted text-[12px]"><span dir="ltr">{product.sku}</span></BpTd>
                      <BpTd className="text-[13px]">{priceLabel(product)}</BpTd>
                      <BpTd className="text-[13px]">
                        <span className={product.stock <= lowStockThreshold ? "font-bold text-[var(--bp-danger)]" : ""}>{product.stock.toLocaleString("fa-IR")}</span>
                      </BpTd>
                      <BpTd><AdminStatusBadge tone={productStatusTones[product.status]}>{productStatusLabels[product.status]}</AdminStatusBadge></BpTd>
                      <BpTd>
                        <div className="flex items-center gap-1.5">
                          <Link href={`/admin/products/${product.id}/options`} aria-label={`مدیریت تنوع محصول ${product.name}`} title="مدیریت تنوع" className="bp-btn bp-btn-secondary bp-btn-icon bp-btn-sm"><Settings2 size={15} /></Link>
                          <Link href={`/admin/products/${product.id}/edit`} aria-label={`ویرایش محصول ${product.name}`} title="ویرایش محصول" className="bp-btn bp-btn-secondary bp-btn-icon bp-btn-sm"><Pencil size={15} /></Link>
                        </div>
                      </BpTd>
                    </tr>
                  ))}
                </tbody>
              </BpTable>
            </AdminBulkEditor>
            <AdminPagination page={pagination.page} pageSize={pagination.pageSize} totalItems={pagination.totalItems} totalPages={pagination.totalPages} />
          </>
        ) : <AdminEmptyState title="محصولی پیدا نشد" description="فیلترها را تغییر دهید یا اولین محصول را ثبت کنید." />}
      </Panel>
    </div>
  );
}
