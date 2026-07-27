import Image from "next/image";
import Link from "next/link";
import { FolderTree, Pencil, Plus, Star } from "lucide-react";
import type { Prisma } from "@generated/prisma/client";
import { db } from "@/lib/db";
import { AdminEmptyState, AdminPageHeader, AdminPanel, AdminPrimaryLink, AdminStatusBadge } from "@/components/admin-ui";
import { CategoryDeleteButton } from "@/components/category-delete-button";
import { Card, Table, TableBody, TableCell, TableColumn, TableContent, TableHeader, TableRow, TableScrollContainer } from "@/components/hero";
import { AdminListFilters } from "@/components/admin-list-filters";
import { AdminPagination } from "@/components/admin-pagination";
import { parseAdminPagination, resolveAdminPagination } from "@/lib/admin-pagination";
import { requirePermission } from "@/modules/auth/session";

type Context = { searchParams: Promise<{ q?: string; status?: string; featured?: string; page?: string; pageSize?: string }> };
type CategoryRow = Prisma.CategoryGetPayload<{ include: { image: true; parent: { select: { name: true } }; _count: { select: { products: true; children: true } } } }>;

export default async function CategoriesPage({ searchParams }: Context) {
  await requirePermission("catalog:manage");
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const status = params.status === "active" || params.status === "inactive" ? params.status : undefined;
  const featuredFilter = params.featured === "yes" || params.featured === "no" ? params.featured : undefined;
  const { requestedPage, pageSize } = parseAdminPagination(params);
  const where: Prisma.CategoryWhereInput = {
    ...(query ? { OR: [{ name: { contains: query } }, { slug: { contains: query } }, { parent: { is: { name: { contains: query } } } }] } : {}),
    ...(status ? { isActive: status === "active" } : {}),
    ...(featuredFilter ? { featured: featuredFilter === "yes" } : {}),
  };
  const filteredTotal = await db.category.count({ where });
  const pagination = resolveAdminPagination(filteredTotal, requestedPage, pageSize);
  const [categories, total, active, featuredCount] = await Promise.all([
    db.category.findMany({ where, skip: pagination.skip, take: pagination.pageSize, include: { image: true, parent: { select: { name: true } }, _count: { select: { products: true, children: true } } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.category.count(),
    db.category.count({ where: { isActive: true } }),
    db.category.count({ where: { featured: true } }),
  ]);

  return (
    <>
      <AdminPageHeader eyebrow="ساختار فروشگاه" title="دسته‌بندی‌ها" description="دسته‌های اصلی، زیردسته‌ها، ترتیب نمایش و تصویر شاخص را مدیریت کنید." action={<AdminPrimaryLink href="/admin/categories/new"><Plus size={17} />دسته جدید</AdminPrimaryLink>} />

      <div className="mb-5 grid grid-cols-3 gap-3">
        {[{ label: "همه دسته‌ها", value: total }, { label: "دسته فعال", value: active }, { label: "صفحه اصلی", value: featuredCount }].map((item) => <Card key={item.label} variant="secondary" className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4"><strong className="block text-xl font-black text-[#172b4d]">{item.value.toLocaleString("fa-IR")}</strong><span className="text-[11px] text-slate-500 sm:text-xs">{item.label}</span></Card>)}
      </div>

      <AdminPanel>
        <div className="border-b border-slate-100 bg-slate-50/70 p-4"><AdminListFilters path="/admin/categories" query={query} queryLabel="جست‌وجوی دسته‌بندی" queryPlaceholder="نام، نشانی یا دسته والد" filters={[{ name: "status", label: "وضعیت دسته‌بندی", value: status ?? "", options: [{ value: "", label: "همه وضعیت‌ها" }, { value: "active", label: "فعال" }, { value: "inactive", label: "غیرفعال" }] }, { name: "featured", label: "نمایش در صفحه اصلی", value: featuredFilter ?? "", options: [{ value: "", label: "همه دسته‌ها" }, { value: "yes", label: "نمایش در صفحه اصلی" }, { value: "no", label: "عدم نمایش در صفحه اصلی" }] }]} /></div>

        {categories.length ? <>
          <div className="grid gap-3 p-3 md:hidden">{categories.map((category) => <CategoryMobileCard key={category.id} category={category} />)}</div>
          <Table className="hidden md:block"><TableScrollContainer><TableContent aria-label="فهرست دسته‌بندی‌ها" className="w-full min-w-[940px]"><TableHeader>{["ردیف", "دسته‌بندی", "والد", "محصولات", "زیردسته‌ها", "ترتیب", "وضعیت", "عملیات"].map((head, index) => <TableColumn id={head} key={head} isRowHeader={index === 1} className="bg-white px-5 py-4 text-right text-xs font-bold text-slate-500">{head}</TableColumn>)}</TableHeader><TableBody>{categories.map((category, index) => <CategoryTableRow key={category.id} category={category} rowNumber={pagination.skip + index + 1} />)}</TableBody></TableContent></TableScrollContainer></Table>
          <AdminPagination {...pagination} />
        </> : <AdminEmptyState title="دسته‌بندی‌ای پیدا نشد" description="فیلترها را تغییر دهید یا اولین دسته فروشگاه را ثبت کنید." />}
      </AdminPanel>
    </>
  );
}

function CategoryThumb({ category }: { category: CategoryRow }) {
  return <div className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#f3efe7] text-[#b5904c]">{category.image?.type === "IMAGE" ? <Image src={category.image.url} alt={category.image.alt ?? category.name} fill sizes="56px" className="object-cover" /> : <FolderTree size={20} />}</div>;
}

function CategoryMobileCard({ category }: { category: CategoryRow }) {
  const locked = category._count.products > 0 || category._count.children > 0;
  return <Card variant="secondary" className="rounded-2xl border border-slate-100 p-4"><div className="flex gap-3"><CategoryThumb category={category} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><strong className="block truncate text-sm text-slate-800">{category.name}</strong><code className="text-[0.68rem] text-[#9a7434]">{category.slug}</code></div>{category.featured && <Star size={16} className="shrink-0 fill-[#b5904c] text-[#b5904c]" />}</div><span className="mt-1 block text-xs text-slate-400">{category.parent?.name ? `زیرمجموعه ${category.parent.name}` : "دسته اصلی"}</span></div></div><div className="mt-4 flex flex-wrap items-center gap-2"><AdminStatusBadge tone={category.isActive ? "success" : "neutral"}>{category.isActive ? "فعال" : "غیرفعال"}</AdminStatusBadge><span className="text-xs text-slate-500">{category._count.products.toLocaleString("fa-IR")} محصول · {category._count.children.toLocaleString("fa-IR")} زیردسته</span></div><div className="mt-4 grid grid-cols-2 gap-2"><Link href={`/admin/categories/${category.id}/edit`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-100 text-sm font-bold text-[#172b4d]"><Pencil size={15} />ویرایش</Link><CategoryDeleteButton id={category.id} name={category.name} disabled={locked} /></div></Card>;
}

function CategoryTableRow({ category, rowNumber }: { category: CategoryRow; rowNumber: number }) {
  const cell = "px-5 py-4 text-sm";
  const locked = category._count.products > 0 || category._count.children > 0;
  return <TableRow id={category.id} className="transition hover:bg-slate-50/70"><TableCell className={`${cell} w-16 font-bold text-slate-400`}>{rowNumber.toLocaleString("fa-IR")}</TableCell><TableCell className={cell}><div className="flex items-center gap-3"><CategoryThumb category={category} /><div className="min-w-0"><div className="flex items-center gap-2"><strong className="truncate text-slate-800">{category.name}</strong>{category.featured && <Star size={14} className="fill-[#b5904c] text-[#b5904c]" />}</div><code className="text-[0.68rem] text-[#9a7434]">{category.slug}</code></div></div></TableCell><TableCell className={`${cell} text-slate-500`}>{category.parent?.name ?? "دسته اصلی"}</TableCell><TableCell className={`${cell} text-slate-600`}>{category._count.products.toLocaleString("fa-IR")}</TableCell><TableCell className={`${cell} text-slate-600`}>{category._count.children.toLocaleString("fa-IR")}</TableCell><TableCell className={`${cell} text-slate-600`}>{category.sortOrder.toLocaleString("fa-IR")}</TableCell><TableCell className={cell}><AdminStatusBadge tone={category.isActive ? "success" : "neutral"}>{category.isActive ? "فعال" : "غیرفعال"}</AdminStatusBadge></TableCell><TableCell className={cell}><div className="flex items-center gap-2"><Link href={`/admin/categories/${category.id}/edit`} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-[#172b4d] hover:border-[#b5904c]"><Pencil size={14} />ویرایش</Link><CategoryDeleteButton id={category.id} name={category.name} disabled={locked} /></div></TableCell></TableRow>;
}
