import { ProductForm } from "@/components/product-form";
import { db } from "@/lib/db";

export default async function NewProduct() {
  const categories = await db.category.findMany({
    where: { isActive: true },
    include: { parent: { select: { name: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return (
    <>
      <div className="mb-6">
        <h1 className="m-0 text-2xl sm:text-3xl">محصول جدید</h1>
        <span className="text-sm text-[#747982]">اطلاعات فنی برای قیمت‌گذاری دقیق ضروری است.</span>
      </div>
      <ProductForm categories={categories.map((category) => ({ id: category.id, name: category.name, parentName: category.parent?.name ?? null }))} />
    </>
  );
}
