import Link from "next/link";

const navLinks = [
  { href: "/admin", label: "نمای کلی" },
  { href: "/admin/products", label: "محصولات" },
  { href: "/admin/media", label: "گالری رسانه" },
  { href: "/admin/orders", label: "سفارش‌ها" },
  { href: "/admin/users", label: "کاربران" },
  { href: "/", label: "مشاهده فروشگاه" },
];

export function AdminSidebar() {
  return (
    <aside className="bg-[#132542] text-white p-[22px] self-start sticky top-[184px]">
      <div className="px-[10px] pb-[18px] border-b border-white/10 mb-3">
        <strong className="block text-sm">مدیریت زر</strong>
        <small className="text-white/60 text-xs">مرکز عملیات فروشگاه</small>
      </div>
      <nav className="grid gap-[5px]">
        {navLinks.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="block text-white/70 px-[10px] py-[10px] text-sm transition-colors hover:text-white hover:bg-white/8"
          >
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
