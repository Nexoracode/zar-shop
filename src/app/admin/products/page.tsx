import Image from "next/image";
import Link from "next/link";
import { Pencil, Plus, Search, Star } from "lucide-react";
import type { Prisma, ProductStatus } from "@generated/prisma/client";
import { db } from "@/lib/db";
import { AdminEmptyState, AdminPageHeader, AdminPanel, AdminPrimaryLink, AdminStatusBadge, adminFieldClass } from "@/components/admin-ui";
import { productStatusLabels, productStatusTones } from "@/modules/admin/labels";

type Context = { searchParams: Promise<{ q?: string; status?: string; category?: string }> };
type ProductRow = Prisma.ProductGetPayload<{ include: { category: true; media: { include: { media: true } } } }>;

export default async function AdminProducts({ searchParams }: Context) {
  const params = await searchParams;
  const status = (["DRAFT", "ACTIVE", "ARCHIVED"] as const).includes(params.status as ProductStatus) ? params.status as ProductStatus : undefined;
  const where: Prisma.ProductWhereInput = {
    ...(params.q ? { OR: [{ name: { contains: params.q } }, { sku: { contains: params.q } }, { slug: { contains: params.q } }] } : {}),
    ...(status ? { status } : {}),
    ...(params.category ? { categoryId: params.category } : {}),
  };
  const [products, categories, total, active, drafts] = await Promise.all([
    db.product.findMany({ where, orderBy: { updatedAt: "desc" }, include: { category: true, media: { where: { isCover: true }, include: { media: true }, take: 1 } } }),
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    db.product.count(),
    db.product.count({ where: { status: "ACTIVE" } }),
    db.product.count({ where: { status: "DRAFT" } }),
  ]);

  return (
    <>
      <AdminPageHeader eyebrow="مدیریت کاتالوگ" title="محصولات" description="محصولات، موجودی، قیمت‌گذاری و وضعیت انتشار را از یک‌جا مدیریت کنید." action={<AdminPrimaryLink href="/admin/products/new"><Plus size={17} />محصول جدید</AdminPrimaryLink>} />

      <div className="mb-5 grid grid-cols-3 gap-3">
        {[{ label: "همه محصولات", value: total }, { label: "منتشرشده", value: active }, { label: "پیش‌نویس", value: drafts }].map((item) => <div key={item.label} className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4"><strong className="block text-xl font-black text-[#172b4d]">{item.value.toLocaleString("fa-IR")}</strong><span className="text-[11px] text-slate-500 sm:text-xs">{item.label}</span></div>)}
      </div>

      <AdminPanel>
        <form className="grid gap-3 border-b border-slate-100 bg-slate-50/70 p-4 md:grid-cols-[minmax(220px,1fr)_180px_180px_auto]">
          <label className="relative"><Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><input name="q" defaultValue={params.q} placeholder="جست‌وجوی نام، کد یا نشانی..." className={`${adminFieldClass} pr-10`} /></label>
          <select name="status" defaultValue={status ?? ""} className={adminFieldClass}><option value="">همه وضعیت‌ها</option>{Object.entries(productStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <select name="category" defaultValue={params.category ?? ""} className={adminFieldClass}><option value="">همه دسته‌ها</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
          <button className="min-h-11 rounded-xl bg-[#172b4d] px-5 text-sm font-bold text-white">اعمال فیلتر</button>
        </form>

        {products.length ? <>
          <div className="grid gap-3 p-3 md:hidden">{products.map((product: ProductRow) => <ProductMobileCard key={product.id} product={product} />)}</div>
          <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[820px] border-collapse"><thead><tr>{["محصول", "کد کالا", "وزن", "موجودی", "وضعیت", "عملیات"].map((head) => <th key={head} className="border-b border-slate-100 bg-white px-5 py-4 text-right text-xs font-bold text-slate-400">{head}</th>)}</tr></thead><tbody>{products.map((product: ProductRow) => <ProductTableRow key={product.id} product={product} />)}</tbody></table></div>
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
  return <article className="rounded-2xl border border-slate-100 p-4"><div className="flex gap-3"><ProductThumb product={product} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><strong className="block truncate text-sm text-slate-800">{product.name}</strong><span className="text-xs text-slate-400">{product.category?.name ?? "بدون دسته‌بندی"}</span></div>{product.featured && <Star size={16} className="shrink-0 fill-[#b5904c] text-[#b5904c]" />}</div><div className="mt-3 flex flex-wrap items-center gap-2"><AdminStatusBadge tone={productStatusTones[product.status]}>{productStatusLabels[product.status]}</AdminStatusBadge><span className="text-xs text-slate-500">موجودی: {product.stock.toLocaleString("fa-IR")}</span></div></div></div><Link href={`/admin/products/${product.id}/edit`} className="mt-4 flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-100 text-sm font-bold text-[#172b4d]"><Pencil size={15} />ویرایش محصول</Link></article>;
}

function ProductTableRow({ product }: { product: ProductRow }) {
  const cell = "border-b border-slate-100 px-5 py-4 text-sm";
  return <tr className="transition hover:bg-slate-50/70"><td className={cell}><div className="flex items-center gap-3"><ProductThumb product={product} /><div className="min-w-0"><div className="flex items-center gap-2"><strong className="truncate text-slate-800">{product.name}</strong>{product.featured && <Star size={14} className="fill-[#b5904c] text-[#b5904c]" />}</div><span className="text-xs text-slate-400">{product.category?.name ?? "بدون دسته‌بندی"}</span></div></div></td><td dir="ltr" className={`${cell} text-right font-mono text-xs text-slate-500`}>{product.sku}</td><td className={`${cell} text-slate-600`}>{Number(product.weightGrams).toLocaleString("fa-IR", { maximumFractionDigits: 3 })} گرم</td><td className={cell}><span className={product.stock <= 2 ? "font-bold text-rose-600" : "text-slate-600"}>{product.stock.toLocaleString("fa-IR")}</span></td><td className={cell}><AdminStatusBadge tone={productStatusTones[product.status]}>{productStatusLabels[product.status]}</AdminStatusBadge></td><td className={cell}><Link href={`/admin/products/${product.id}/edit`} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-[#172b4d] hover:border-[#b5904c]"><Pencil size={14} />ویرایش</Link></td></tr>;
}
