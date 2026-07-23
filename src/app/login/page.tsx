import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <main className="min-h-[calc(100vh-163px)] grid place-items-center py-[60px] px-4 bg-[#f5f5f3]">
      <section className="w-[min(470px,100%)] bg-white border border-[#e7e6e2] p-[38px] shadow-[0_22px_70px_rgba(29,49,85,0.08)]">
        <h1 className="mt-0 mb-[6px]">خوش آمدید</h1>
        <p className="text-[#747982] mt-0 mb-[25px]">برای مشاهده سفارش‌ها و ادامه خرید وارد شوید.</p>
        <AuthForm mode="login" />
        <p className="mt-[18px] mb-0 text-sm">
          حساب ندارید؟{" "}
          <Link href="/register" className="text-[#785b27] hover:underline">ثبت‌نام کنید</Link>
        </p>
      </section>
    </main>
  );
}
