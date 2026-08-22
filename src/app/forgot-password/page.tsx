import { Card } from "@/components/hero";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { StandaloneTopBar } from "@/components/standalone-top-bar";

export default function ForgotPasswordPage() {
  return (
    <>
      <StandaloneTopBar backHref="/login" backLabel="بازگشت به ورود" />
      <main className="grid min-h-[calc(100dvh-4rem)] place-items-center bg-[#f7f7f5] px-4 py-10 sm:py-14">
        <div className="w-full max-w-[420px]">
          <Card variant="secondary" className="rounded-2xl border border-[#e7e6e2] bg-white p-6 shadow-[0_22px_70px_rgba(29,49,85,0.06)] sm:p-8">
            <ForgotPasswordForm />
          </Card>
        </div>
      </main>
    </>
  );
}
