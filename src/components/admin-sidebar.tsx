import Link from "next/link";

const navLinks = [
  { href: "/admin", label: "نمای کلی" },
  { href: "/admin/products", label: "محصولات" },
  { href: "/admin/categories", label: "دسته‌بندی‌ها" },
  { href: "/admin/media", label: "گالری رسانه" },
  { href: "/admin/orders", label: "سفارش‌ها" },
  { href: "/admin/users", label: "کاربران" },
  { href: "/", label: "مشاهده فروشگاه" },
];

export function AdminSidebar() {
  return (
    <aside className="self-start bg-[#132542] p-4 text-white lg:sticky lg:top-[172px] lg:p-[22px]">
      <div className="px-[10px] pb-[18px] border-b border-white/10 mb-3">
        <strong className="block text-sm">مدیریت زر</strong>
        <small className="text-white/60 text-xs">مرکز عملیات فروشگاه</small>
      </div>
      <nav className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:gap-[5px]">
        {navLinks.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="block shrink-0 px-[10px] py-[10px] text-sm text-white/70 transition-colors hover:bg-white/8 hover:text-white"
          >
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
