import Link from "next/link";
import { ArrowLeft, FolderTree, Layers3, SlidersHorizontal } from "lucide-react";
import type { Prisma } from "@generated/prisma/client";
import { AdminEmptyState, AdminPageHeader, AdminPanel, AdminStatusBadge } from "@/components/admin-ui";
import { AdminListFilters } from "@/components/admin-list-filters";
import { AdminPagination } from "@/components/admin-pagination";
import { Card } from "@/components/hero";
import { db } from "@/lib/db";
import { parseAdminPagination, resolveAdminPagination } from "@/lib/admin-pagination";
import { requirePermission } from "@/modules/auth/session";
import { parseCategoryAttributeSchema } from "@/modules/products/attributes";

type Context = { searchParams: Promise<{ q?: string; page?: string; pageSize?: string }> };
type CategoryItem = Prisma.CategoryGetPayload<{
  select: {
    id: true;
    name: true;
    slug: true;
    isActive: true;
    attributeSchema: true;
    parent: { select: { name: true } };
    _count: { select: { products: true } };
  };
}>;

export default async function CategoryAttributesPage({ searchParams }: Context) {
  await requirePermission("catalog:manage");
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const { requestedPage, pageSize } = parseAdminPagination(params);
  const where: Prisma.CategoryWhereInput = query
    ? { OR: [{ name: { contains: query } }, { slug: { contains: query } }, { parent: { is: { name: { contains: query } } } }] }
    : {};
  const total = await db.category.count({ where });
  const pagination = resolveAdminPagination(total, requestedPage, pageSize);
  const categories = await db.category.findMany({
    where,
    skip: pagination.skip,
    take: pagination.pageSize,
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      attributeSchema: true,
      parent: { select: { name: true } },
      _count: { select: { products: true } },
    },
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <>
      <AdminPageHeader
        eyebrow="تنوع و ویژگی‌ها"
        title="ویژگی‌های دسته‌بندی"
        description="برای هر دسته‌بندی، گروه‌ها و ویژگی‌های توصیفی مخصوص همان محصولات را مدیریت کنید."
      />
      <AdminPanel>
        <div className="border-b border-slate-100 bg-slate-50/70 p-4">
          <AdminListFilters
            path="/admin/category-attributes"
            query={query}
            queryLabel="جست‌وجوی دسته‌بندی"
            queryPlaceholder="نام، نشانی یا دسته والد"
            filters={[]}
          />
        </div>
        {categories.length ? (
          <>
            <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {categories.map((category) => <CategoryAttributeCard key={category.id} category={category} />)}
            </div>
            <AdminPagination {...pagination} />
          </>
        ) : (
          <AdminEmptyState title="دسته‌بندی‌ای پیدا نشد" description="عبارت جست‌وجو را تغییر دهید یا ابتدا یک دسته‌بندی بسازید." />
        )}
      </AdminPanel>
    </>
  );
}

function CategoryAttributeCard({ category }: { category: CategoryItem }) {
  const groups = parseCategoryAttributeSchema(category.attributeSchema);
  const attributeCount = groups.reduce((total, group) => total + group.attributes.length, 0);

  return (
    <Card variant="secondary" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><FolderTree size={19} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <strong className="block truncate text-sm text-slate-800">{category.name}</strong>
              <span className="mt-1 block truncate text-[11px] text-slate-400">{category.parent?.name ? `زیرمجموعه ${category.parent.name}` : "دسته اصلی"}</span>
            </div>
            <AdminStatusBadge tone={category.isActive ? "success" : "neutral"}>{category.isActive ? "فعال" : "غیرفعال"}</AdminStatusBadge>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1"><Layers3 size={13} />{groups.length.toLocaleString("fa-IR")} گروه</span>
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1"><SlidersHorizontal size={13} />{attributeCount.toLocaleString("fa-IR")} ویژگی</span>
            <span className="rounded-md bg-slate-100 px-2 py-1">{category._count.products.toLocaleString("fa-IR")} محصول</span>
          </div>
        </div>
      </div>
      <Link href={`/admin/categories/${category.id}/attributes`} className="mt-4 flex min-h-10 items-center justify-between rounded-lg border border-violet-200 bg-violet-50 px-3 text-xs font-bold text-violet-700 transition hover:border-violet-300 hover:bg-violet-100/70">
        <span>{attributeCount ? "مدیریت ویژگی‌ها" : "تعریف اولین ویژگی"}</span>
        <ArrowLeft size={15} />
      </Link>
    </Card>
  );
}
