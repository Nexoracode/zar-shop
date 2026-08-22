import Link from "next/link";
import { Card } from "@/components/hero";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f5f5f3] px-4 py-12 sm:py-[60px]">
      <Card variant="secondary" className="w-full max-w-[470px] rounded-2xl border border-[#e7e6e2] bg-white p-6 shadow-[0_22px_70px_rgba(29,49,85,0.08)] sm:p-[38px]">
        <h1 className="mt-0 mb-[6px]">بازیابی رمز عبور</h1>
        <p className="text-[#747982] mt-0 mb-[25px]">ایمیل حساب خود را وارد کنید تا کد بازیابی به شماره همراه ثبت‌شده پیامک شود.</p>
        <ForgotPasswordForm />
        <p className="mt-[18px] mb-0 text-sm">
          رمز عبور خود را به‌خاطر آوردید؟{" "}
          <Link href="/login" className="text-[var(--brand-accent)] hover:underline">ورود به حساب</Link>
        </p>
      </Card>
    </main>
  );
}
