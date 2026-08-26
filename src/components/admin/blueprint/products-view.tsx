import Link from "next/link";
import { Layers, LayoutGrid, Plus, SlidersVertical, SquarePen, Star, Tag } from "lucide-react";
import { AdminEmptyState, AdminPageHeader, AdminPrimaryLink } from "@/components/admin-ui";
import { productStatusLabels, productStatusTones } from "@/modules/admin/labels";
import { AdminListFilters } from "@/components/admin-list-filters";
import { AdminPagination } from "@/components/admin-pagination";
import { AdminBulkCheckbox, AdminBulkEditor } from "@/components/admin-bulk-editor";
import { isProductDiscountActive } from "@/modules/products/discount";
import { DiscountExpiryRefresh } from "@/components/discount-expiry-refresh";
import { formatDateTime } from "@/lib/format";
import type { AdminProductsListData, ProductRow } from "@/components/admin/products-list-data";
import { ProductPublishToggle } from "./product-publish-toggle";
import { BpTable, BpTd, BpTh } from "./ui/table";
import { BpTag } from "./ui/tag";

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`bp-frame relative ${className}`}>{children}</section>;
}

/*
 * The unit lives in the column header, so the cells carry bare numbers. `formatMoney` is not
 * used here because it appends its own unit — and its default is ریال, which is what the rest
 * of the panel reports, so the header says ریال too.
 */
function priceLabel(product: ProductRow) {
  if (product.storeIndustry === "GOLD") return Number(product.weightGrams).toLocaleString("fa-IR", { maximumFractionDigits: 3 });
  return product.fixedPrice ? Number(product.fixedPrice).toLocaleString("fa-IR", { maximumFractionDigits: 0 }) : "بدون قیمت";
}

/** Row action group: four ghost icon buttons, 15px strokes, 4px apart — as in the mockup. */
function RowActions({ product }: { product: ProductRow }) {
  return (
    <div className="flex items-center gap-1">
      <Link href={`/admin/products/${product.id}/edit`} title="ویرایش محصول" aria-label={`ویرایش محصول ${product.name}`} className="bp-btn bp-btn-ghost bp-btn-icon bp-btn-sm">
        <SquarePen size={15} strokeWidth={1.5} />
      </Link>
      <ProductPublishToggle id={product.id} name={product.name} status={product.status} />
      <Link href={`/admin/products/${product.id}/attributes`} title="مدیریت ویژگی محصول" aria-label={`مدیریت ویژگی محصول ${product.name}`} className="bp-btn bp-btn-ghost bp-btn-icon bp-btn-sm">
        <SlidersVertical size={15} strokeWidth={1.5} />
      </Link>
      <Link href={`/admin/products/${product.id}/options`} title="مدیریت تنوع محصول" aria-label={`مدیریت تنوع محصول ${product.name}`} className="bp-btn bp-btn-ghost bp-btn-icon bp-btn-sm">
        <LayoutGrid size={15} strokeWidth={1.5} />
      </Link>
    </div>
  );
}

/** Native `title` rather than a tooltip component — the Blueprint rules keep these controls light. */
function discountTooltip(product: ProductRow) {
  if (!product.discountStartsAt || !product.discountEndsAt) return "تخفیف فعال";
  return `تخفیف فعال
از ${formatDateTime(product.discountStartsAt)}
تا ${formatDateTime(product.discountEndsAt)}`;
}

/** Name cell: the product name with bare inline glyphs for its flags — no chips, no thumbnail. */
function ProductName({ product }: { product: ProductRow }) {
  return (
    <div className="flex items-baseline gap-[7px]">
      <span className="truncate" title={product.name}>{product.name}</span>
      {product.featured && <Star size={14} strokeWidth={2} className="shrink-0 translate-y-0.5 fill-[var(--bp-accent)] text-[var(--bp-accent)]" aria-label="محصول ویژه" />}
      {isProductDiscountActive(product) && <span title={discountTooltip(product)} className="shrink-0 translate-y-0.5 cursor-help leading-none text-[var(--bp-danger)]"><Tag size={14} strokeWidth={1.9} aria-label={discountTooltip(product)} /></span>}
      {product._count.options > 0 && <Layers size={14} strokeWidth={1.9} className="shrink-0 translate-y-0.5 text-[var(--bp-accent)]" aria-label={`${product._count.options.toLocaleString("fa-IR")} گروه تنوع`} />}
    </div>
  );
}

export function BlueprintProductsView({ products, categories, filters, pagination, lowStockThreshold, storeIndustry, nextDiscountBoundaryAt }: AdminProductsListData) {
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
    <div className="flex flex-col gap-3">
      {/* Redraws the rows the moment any discount opens or closes, so the flags cannot go stale. */}
      <DiscountExpiryRefresh at={nextDiscountBoundaryAt} />
      <AdminPageHeader
        flush
        title="محصولات"
        description="محصولات، موجودی، قیمت‌گذاری و وضعیت انتشار را از یک‌جا مدیریت کنید."
        action={<AdminPrimaryLink href="/admin/products/new"><Plus size={16} />محصول جدید</AdminPrimaryLink>}
      />

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
                <article key={product.id} className="flex flex-col gap-3 border-b border-[var(--bp-row-line)] p-4 last:border-b-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <ProductName product={product} />
                      <span className="bp-muted mt-1 block truncate text-[11px]">{product.category?.name ?? "بدون دسته‌بندی"}</span>
                    </div>
                    <BpTag tone={productStatusTones[product.status]} size="md" withDot>{productStatusLabels[product.status]}</BpTag>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-[13px]">
                    <span>{priceLabel(product)} {storeIndustry === "GOLD" ? "گرم" : "ریال"}</span>
                    <span className={product.stock <= lowStockThreshold ? "font-bold text-[var(--bp-danger)]" : "bp-muted"}>موجودی: {product.stock.toLocaleString("fa-IR")}</span>
                  </div>
                  <RowActions product={product} />
                </article>
              ))}
            </div>

            <AdminBulkEditor entity="products" entityLabel="محصول" ids={products.map((product) => product.id)} actions={bulkActions}>
              <BpTable ariaLabel="فهرست محصولات" minWidth={860}>
                <thead>
                  <tr>
                    <BpTh className="w-10 text-center"><span className="sr-only">انتخاب</span></BpTh>
                    <BpTh className="w-10">#</BpTh>
                    <BpTh>محصول</BpTh>
                    <BpTh>دسته‌بندی</BpTh>
                    <BpTh>{storeIndustry === "GOLD" ? "وزن (گرم)" : "قیمت (ریال)"}</BpTh>
                    <BpTh>موجودی</BpTh>
                    <BpTh>وضعیت</BpTh>
                    <BpTh className="text-center">عملیات</BpTh>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product, index) => (
                    <tr key={product.id}>
                      <BpTd className="w-10 text-center"><AdminBulkCheckbox id={product.id} label={`انتخاب محصول ${product.name}`} /></BpTd>
                      <BpTd className="bp-muted w-10">{(pagination.skip + index + 1).toLocaleString("fa-IR")}</BpTd>
                      <BpTd className="max-w-[300px]"><ProductName product={product} /></BpTd>
                      <BpTd className="bp-muted max-w-[180px] truncate" title={product.category?.name ?? "بدون دسته‌بندی"}>{product.category?.name ?? "بدون دسته‌بندی"}</BpTd>
                      <BpTd>{priceLabel(product)}</BpTd>
                      <BpTd className={product.stock <= lowStockThreshold ? "font-bold text-[var(--bp-danger)]" : ""}>{product.stock.toLocaleString("fa-IR")}</BpTd>
                      <BpTd><BpTag tone={productStatusTones[product.status]} size="md" withDot>{productStatusLabels[product.status]}</BpTag></BpTd>
                      <BpTd><RowActions product={product} /></BpTd>
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
