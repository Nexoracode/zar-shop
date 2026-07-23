import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function RegisterPage() {
  return (
    <main className="min-h-[calc(100vh-163px)] grid place-items-center py-[60px] px-4 bg-[#f5f5f3]">
      <section className="w-[min(470px,100%)] bg-white border border-[#e7e6e2] p-[38px] shadow-[0_22px_70px_rgba(29,49,85,0.08)]">
        <h1 className="mt-0 mb-[6px]">ساخت حساب زر</h1>
        <p className="text-[#747982] mt-0 mb-[25px]">اطلاعات شما برای خرید امن و صدور فاکتور استفاده می‌شود.</p>
        <AuthForm mode="register" />
        <p className="mt-[18px] mb-0 text-sm">
          قبلاً ثبت‌نام کرده‌اید؟{" "}
          <Link href="/login" className="text-[#785b27] hover:underline">وارد شوید</Link>
        </p>
      </section>
    </main>
  );
}
