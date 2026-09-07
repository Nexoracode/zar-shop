import Link from "next/link";
import { LayoutDashboard, Compass } from "lucide-react";

export default function AdminNotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4 py-12">
      <div className="bp-frame w-full max-w-md p-8 text-center">
        <span className="mx-auto mb-4 block text-5xl font-bold text-[var(--bp-accent)]">۴۰۴</span>
        <h3 className="m-0">صفحه مورد نظر پیدا نشد</h3>
        <p className="bp-muted mb-0 mt-2 text-[13px] leading-7">این نشانی در پنل مدیریت وجود ندارد یا مورد موردنظر حذف یا جابه‌جا شده است.</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/admin" className="bp-btn bp-btn-primary gap-2"><LayoutDashboard size={16} />بازگشت به داشبورد</Link>
          <Link href="/admin/products" className="bp-btn bp-btn-secondary gap-2"><Compass size={16} />مشاهده محصولات</Link>
        </div>
      </div>
    </div>
  );
}
