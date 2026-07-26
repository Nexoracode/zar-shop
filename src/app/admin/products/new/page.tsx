import { ProductForm } from "@/components/product-form";

export default function NewProduct() {
  return (
    <>
      <div className="mb-6">
        <h1 className="m-0 text-2xl sm:text-3xl">محصول جدید</h1>
        <span className="text-sm text-[#747982]">اطلاعات فنی برای قیمت‌گذاری دقیق ضروری است.</span>
      </div>
      <ProductForm />
    </>
  );
}
