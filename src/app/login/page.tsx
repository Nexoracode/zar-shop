import Link from "next/link";
import { Card } from "@/components/hero";
import { AuthFlow } from "@/components/auth-flow";

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f5f5f3] px-4 py-12 sm:py-[60px]">
      <Card variant="secondary" className="w-full max-w-[470px] rounded-2xl border border-[#e7e6e2] bg-white p-6 shadow-[0_22px_70px_rgba(29,49,85,0.08)] sm:p-[38px]">
        <h1 className="mt-0 mb-[6px]">خوش آمدید</h1>
        <p className="text-[#747982] mt-0 mb-[25px]">شماره موبایل خود را وارد کنید تا وارد حساب شوید یا ثبت‌نام کنید.</p>
        <AuthFlow />
        <p className="mt-[14px] mb-0 text-sm">
          <Link href="/forgot-password" className="text-[var(--brand-accent)] hover:underline">فراموشی رمز عبور؟</Link>
        </p>
      </Card>
    </main>
  );
}
