import { notFound } from "next/navigation";
import { BlueprintBrandForm } from "@/components/admin/blueprint/brand-form";
import { AdminPageHeader } from "@/components/admin-ui";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";

type Context = { params: Promise<{ id: string }> };

export default async function EditBrandPage({ params }: Context) {
  await requirePermission("catalog:manage");
  const { id } = await params;
  const brand = await db.brand.findUnique({ where: { id }, include: { logo: { select: { id: true, title: true, alt: true, url: true, type: true } } } });
  if (!brand) notFound();

  return (
    <>
      <AdminPageHeader title={`ویرایش «${brand.name}»`} description="نام، نشانی انگلیسی و لوگوی این برند را به‌روزرسانی کنید." backHref="/admin/brands" backLabel="بازگشت به برندها" />
      <BlueprintBrandForm brand={{
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        logo: brand.logo ? { id: brand.logo.id, title: brand.logo.title ?? brand.name, alt: brand.logo.alt, url: brand.logo.url, type: brand.logo.type } : null,
        isActive: brand.isActive,
        featured: brand.featured,
        sortOrder: brand.sortOrder,
      }} />
    </>
  );
}
