import Image from "next/image";
import Link from "next/link";
import { ImageOff, Plus, SquarePen, X } from "lucide-react";
import { AdminEmptyState, AdminPageHeader, AdminPrimaryLink } from "@/components/admin-ui";
import { productStatusLabels, productStatusTones } from "@/modules/admin/labels";
import { AdminListFilters } from "@/components/admin-list-filters";
import { AdminColumnFilter } from "@/components/admin-column-filter";
import { AdminPagination } from "@/components/admin-pagination";
import { AdminBulkCheckbox, AdminBulkEditor, AdminBulkTr } from "@/components/admin-bulk-editor";
import { AdminColumn, AdminColumnSettingsButton, AdminColumnVisibility } from "@/components/admin-column-visibility";
import { DiscountExpiryRefresh } from "@/components/discount-expiry-refresh";
import type { AdminProductsListData, ProductRow } from "@/components/admin/products-list-data";
import { ProductBulkEditButton } from "@/components/product-bulk-edit-modal";
import { ProductDeleteButton } from "./product-delete-button";
import { ProductFlags } from "./product-flags";
import { ProductPrice } from "./product-price";
import { ProductStock } from "./product-stock";
import { ProductRowMenu } from "./product-row-menu";
import { ProductStatusMenu } from "./product-publish-toggle";
import { BpLinkButton } from "./ui/button";
import { BpTable, BpTd, BpTh } from "./ui/table";
import { BpTag } from "./ui/tag";
import { BpTruncated } from "./ui/truncated-text";

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`bp-frame relative ${className}`}>{children}</section>;
}

/** Row action group: ghost icon buttons, 15px strokes, 4px apart — as in the mockup. */
function RowActions({ product }: { product: ProductRow }) {
  return (
    <div className="flex items-center gap-1">
      <Link href={`/admin/products/${product.id}/edit`} title="ویرایش محصول" aria-label={`ویرایش محصول ${product.name}`} className="bp-btn bp-btn-ghost bp-btn-icon bp-btn-sm">
        <SquarePen size={15} strokeWidth={1.5} />
      </Link>
      <ProductStatusMenu id={product.id} name={product.name} status={product.status} />
      <ProductDeleteButton id={product.id} name={product.name} disabled={product._count.orderItems > 0} />
      <ProductRowMenu id={product.id} name={product.name} />
    </div>
  );
}

/** Sets the picture apart from the words, so the two do not read as one run of content. */
function ThumbRule() {
  return <span aria-hidden className="h-7 w-px shrink-0 self-center bg-[var(--bp-divider)]" />;
}

function ProductThumb({ product }: { product: ProductRow }) {
  const cover = product.media[0]?.media;
  if (cover?.type === "IMAGE") {
    return <span className="bp-thumb"><Image src={cover.url} alt={cover.alt ?? product.name} fill sizes="38px" /></span>;
  }
  return <span className="bp-thumb bp-thumb-empty"><ImageOff size={15} strokeWidth={1.6} /></span>;
}

/** Name cell: the product name, cut to one line (its tooltip appears only when it really is cut). */
function ProductName({ product }: { product: ProductRow }) {
  return (
    <div className="min-w-0">
      <BpTruncated text={product.name} />
    </div>
  );
}

const PRODUCTS_TABLE_ID = "products";

export function BlueprintProductsView({ products, categories, filters, pagination, lowStockThreshold, storeIndustry, nextDiscountBoundaryAt, initialHiddenColumns }: AdminProductsListData) {
  const columns = [
    { id: "product", label: "محصول" },
    { id: "offers", label: "تنوع و تخفیف" },
    { id: "category", label: "دسته‌بندی" },
    { id: "brand", label: "برند" },
    { id: "priceOrWeight", label: storeIndustry === "GOLD" ? "وزن (گرم)" : "قیمت (ریال)" },
    { id: "stock", label: "موجودی" },
    { id: "status", label: "وضعیت" },
  ];

  // Column-header filters, replacing the combobox row that used to sit above the table — each
  // group is the exact same URL param / option set `AdminListFilters` used to drive, just
  // surfaced next to the header it belongs to instead of in a bar of its own.
  const categoryFilter = { name: "category", label: "دسته‌بندی", value: filters.category, options: [{ value: "", label: "همه دسته‌ها" }, ...categories.map((category) => ({ value: category.id, label: category.name }))] };
  const stockFilter = { name: "stock", label: "وضعیت موجودی", value: filters.stock, options: [{ value: "", label: "همه موجودی‌ها" }, { value: "in", label: "موجود" }, { value: "low", label: "کم‌موجود" }, { value: "out", label: "ناموجود" }] };
  const statusFilter = { name: "status", label: "وضعیت محصول", value: filters.status, options: [{ value: "", label: "همه وضعیت‌ها" }, ...Object.entries(productStatusLabels).map(([value, label]) => ({ value, label }))] };
  const discountFilter = { name: "discount", label: "وضعیت تخفیف", value: filters.discount, options: [{ value: "", label: "همه تخفیف‌ها" }, { value: "active", label: "دارای تخفیف فعال" }, { value: "upcoming", label: "تخفیف آینده" }, { value: "none", label: "بدون تخفیف" }] };

  const hasActiveFilters = Boolean(filters.query || filters.status || filters.category || filters.stock || filters.discount);

  return (
    <div className="flex flex-col gap-2">
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
          filters={[]}
        />
      </Panel>

      <Panel>
        {products.length ? (
          <>
            <div className="md:hidden">
              {products.map((product) => (
                <article key={product.id} className="flex flex-col gap-3 border-b border-[var(--bp-row-line)] p-4 last:border-b-0">
                  <div className="flex items-start justify-between gap-3">
                    <ProductThumb product={product} />
                    <ThumbRule />
                    <div className="min-w-0 flex-1">
                      <ProductName product={product} />
                      <span className="bp-muted mt-1 block truncate text-[11px]">{product.category?.name ?? "بدون دسته‌بندی"}{product.brand && ` · ${product.brand.name}`}</span>
                      <ProductFlags product={product} className="mt-1.5" />
                    </div>
                    <BpTag tone={productStatusTones[product.status]} size="md" withDot>{productStatusLabels[product.status]}</BpTag>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-[13px]">
                    <span><ProductPrice product={product} /> {storeIndustry === "GOLD" ? "گرم" : "ریال"}</span>
                    <span className="bp-muted"><ProductStock product={product} lowStockThreshold={lowStockThreshold} prefix="موجودی: " /></span>
                  </div>
                  <RowActions product={product} />
                </article>
              ))}
            </div>

            <AdminColumnVisibility tableId={PRODUCTS_TABLE_ID} columns={columns} initialHidden={initialHiddenColumns}>
              <AdminBulkEditor entity="products" entityLabel="محصول" ids={products.map((product) => product.id)} actions={[]} beforeSelectAll={<AdminColumnSettingsButton />} extraAction={<ProductBulkEditButton products={products.map((product) => ({ id: product.id, variantTypeNames: product.optionTypes.map((optionType) => optionType.type.name) }))} categories={categories} />}>
                <BpTable ariaLabel="فهرست محصولات" minWidth={980}>
                  <thead>
                    <tr>
                      <BpTh className="w-10 text-center"><span className="sr-only">انتخاب</span></BpTh>
                      <BpTh className="w-10">#</BpTh>
                      <AdminColumn id="product"><BpTh>محصول</BpTh></AdminColumn>
                      <AdminColumn id="offers"><BpTh><span className="inline-flex items-center">تنوع و تخفیف<AdminColumnFilter path="/admin/products" ariaLabel="فیلتر تخفیف" groups={[discountFilter]} /></span></BpTh></AdminColumn>
                      <AdminColumn id="category"><BpTh><span className="inline-flex items-center">دسته‌بندی<AdminColumnFilter path="/admin/products" ariaLabel="فیلتر دسته‌بندی" groups={[categoryFilter]} /></span></BpTh></AdminColumn>
                      <AdminColumn id="brand"><BpTh>برند</BpTh></AdminColumn>
                      <AdminColumn id="priceOrWeight"><BpTh>{storeIndustry === "GOLD" ? "وزن (گرم)" : "قیمت (ریال)"}</BpTh></AdminColumn>
                      <AdminColumn id="stock"><BpTh><span className="inline-flex items-center">موجودی<AdminColumnFilter path="/admin/products" ariaLabel="فیلتر موجودی" groups={[stockFilter]} /></span></BpTh></AdminColumn>
                      <AdminColumn id="status"><BpTh><span className="inline-flex items-center">وضعیت<AdminColumnFilter path="/admin/products" ariaLabel="فیلتر وضعیت" groups={[statusFilter]} /></span></BpTh></AdminColumn>
                      <BpTh className="text-center">عملیات</BpTh>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product, index) => (
                      <AdminBulkTr key={product.id} id={product.id}>
                        <BpTd className="w-10 text-center"><AdminBulkCheckbox id={product.id} label={`انتخاب محصول ${product.name}`} /></BpTd>
                        <BpTd className="bp-muted w-10">{(pagination.skip + index + 1).toLocaleString("fa-IR")}</BpTd>
                        <AdminColumn id="product"><BpTd className="w-[240px] max-w-[240px]"><div className="flex min-w-0 items-center gap-2.5"><ProductThumb product={product} /><ThumbRule /><ProductName product={product} /></div></BpTd></AdminColumn>
                        <AdminColumn id="offers"><BpTd className="max-w-[200px]"><ProductFlags product={product} emptyDash /></BpTd></AdminColumn>
                        <AdminColumn id="category"><BpTd className="bp-muted max-w-[180px] truncate">{product.category?.name ?? "بدون دسته‌بندی"}</BpTd></AdminColumn>
                        <AdminColumn id="brand"><BpTd className="bp-muted max-w-[140px] truncate">{product.brand?.name ?? "بدون برند"}</BpTd></AdminColumn>
                        <AdminColumn id="priceOrWeight"><BpTd><ProductPrice product={product} /></BpTd></AdminColumn>
                        <AdminColumn id="stock"><BpTd><ProductStock product={product} lowStockThreshold={lowStockThreshold} /></BpTd></AdminColumn>
                        <AdminColumn id="status"><BpTd><BpTag tone={productStatusTones[product.status]} size="md" withDot>{productStatusLabels[product.status]}</BpTag></BpTd></AdminColumn>
                        <BpTd><div className="flex justify-center"><RowActions product={product} /></div></BpTd>
                      </AdminBulkTr>
                    ))}
                  </tbody>
                </BpTable>
              </AdminBulkEditor>
            </AdminColumnVisibility>
            <AdminPagination page={pagination.page} pageSize={pagination.pageSize} totalItems={pagination.totalItems} totalPages={pagination.totalPages} />
          </>
        ) : (
          <AdminEmptyState
            title="محصولی پیدا نشد"
            description={hasActiveFilters ? "فیلترها یا جستجو را تغییر دهید و دوباره تلاش کنید." : "هنوز محصولی ثبت نشده است؛ اولین محصول را ثبت کنید."}
            action={hasActiveFilters ? <BpLinkButton href="/admin/products" variant="secondary" className="gap-2"><X size={14} strokeWidth={1.8} />پاک‌کردن فیلترها و جستجو</BpLinkButton> : undefined}
          />
        )}
      </Panel>
    </div>
  );
}
