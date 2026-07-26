import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function RegisterPage() {
  return (
    <main className="grid min-h-[70vh] place-items-center bg-[#f5f5f3] px-4 py-12 sm:py-[60px]">
      <section className="w-full max-w-[470px] border border-[#e7e6e2] bg-white p-6 shadow-[0_22px_70px_rgba(29,49,85,0.08)] sm:p-[38px]">
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
